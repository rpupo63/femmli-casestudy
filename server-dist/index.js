import express from 'express';
import path from 'path';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from './db.js';
import { encrypt, decrypt } from './lib/crypto.js';
import { fetchOuraSleepData, convertOuraToSleepLog } from './lib/oura.js';
const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
app.use(cors());
app.use(express.json());
// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};
// Helper to decrypt caffeine log
const processCaffeineLog = (row) => {
    if (!row)
        return null;
    let entries = [];
    try {
        const decryptedEntries = decrypt(row.entries);
        // If decryption returns a string, try parsing it. 
        // If it was stored as JSONB previously, it might come out as stringified JSON.
        // If it was encrypted, decrypt returns stringified JSON.
        if (decryptedEntries) {
            entries = JSON.parse(decryptedEntries);
        }
        else if (row.entries && typeof row.entries === 'object') {
            // Fallback for unmigrated JSONB objects if any exist (though we changed type to text)
            entries = row.entries;
        }
        else if (row.entries) {
            // Fallback for unencrypted text
            entries = JSON.parse(row.entries);
        }
    }
    catch (e) {
        console.warn('Failed to parse caffeine entries:', e);
        entries = [];
    }
    return {
        ...row,
        entries,
        notes: decrypt(row.notes)
    };
};
// Helper to decrypt sleep log
const processSleepLog = (row) => {
    if (!row)
        return null;
    const toInt = (val) => {
        const decrypted = decrypt(val);
        return decrypted ? parseInt(decrypted, 10) : null;
    };
    return {
        ...row,
        sleep_score: toInt(row.sleep_score),
        total_sleep: toInt(row.total_sleep),
        deep_sleep: toInt(row.deep_sleep),
        rem_sleep: toInt(row.rem_sleep),
        light_sleep: toInt(row.light_sleep),
        sleep_efficiency: toInt(row.sleep_efficiency),
        restfulness: toInt(row.restfulness),
    };
};
// Auth routes
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        // Check if user already exists
        const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }
        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);
        // Create user
        const result = await pool.query('INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at', [email, passwordHash]);
        const user = result.rows[0];
        // Generate JWT token
        const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        res.json({
            user: {
                id: user.id,
                email: user.email,
                created_at: user.created_at,
            },
            token,
        });
    }
    catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
app.post('/api/auth/signin', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        // Find user
        const result = await pool.query('SELECT id, email, password_hash, created_at FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        const user = result.rows[0];
        // Verify password
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        // Generate JWT token
        const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        res.json({
            user: {
                id: user.id,
                email: user.email,
                created_at: user.created_at,
            },
            token,
        });
    }
    catch (error) {
        console.error('Signin error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
// Get current user
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const result = await pool.query('SELECT id, email, created_at FROM users WHERE id = $1', [userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ user: result.rows[0] });
    }
    catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
// Caffeine logs routes
app.get('/api/caffeine-logs/:date', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const date = req.params.date;
        const result = await pool.query('SELECT * FROM caffeine_logs WHERE user_id = $1 AND log_date = $2', [userId, date]);
        if (result.rows.length === 0) {
            return res.json({ log: null });
        }
        res.json({ log: processCaffeineLog(result.rows[0]) });
    }
    catch (error) {
        console.error('Get caffeine log error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
app.post('/api/caffeine-logs', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { log_date, entries, notes } = req.body;
        if (!log_date || !entries) {
            return res.status(400).json({ error: 'log_date and entries are required' });
        }
        // Encrypt data before storing
        const encryptedEntries = encrypt(JSON.stringify(entries));
        const encryptedNotes = encrypt(notes || null);
        const result = await pool.query(`INSERT INTO caffeine_logs (user_id, log_date, entries, notes)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, log_date)
       DO UPDATE SET entries = $3, notes = $4, updated_at = now()
       RETURNING *`, [userId, log_date, encryptedEntries, encryptedNotes]);
        res.json({ log: processCaffeineLog(result.rows[0]) });
    }
    catch (error) {
        console.error('Create/update caffeine log error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
app.get('/api/caffeine-logs', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        // If limit query param is provided, return list of logs
        if (req.query.limit) {
            const limit = parseInt(req.query.limit) || 14;
            const result = await pool.query('SELECT * FROM caffeine_logs WHERE user_id = $1 ORDER BY log_date DESC LIMIT $2', [userId, limit]);
            const logs = result.rows.map(processCaffeineLog);
            res.json({ logs });
            return;
        }
        // Otherwise return today's log
        const date = new Date().toISOString().split('T')[0];
        const result = await pool.query('SELECT * FROM caffeine_logs WHERE user_id = $1 AND log_date = $2', [userId, date]);
        if (result.rows.length === 0) {
            return res.json({ log: null });
        }
        res.json({ log: processCaffeineLog(result.rows[0]) });
    }
    catch (error) {
        console.error('Get caffeine logs error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
// Sleep logs routes
app.get('/api/sleep-logs/:date', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const date = req.params.date;
        const result = await pool.query('SELECT * FROM sleep_logs WHERE user_id = $1 AND log_date = $2', [userId, date]);
        if (result.rows.length === 0) {
            return res.json({ log: null });
        }
        res.json({ log: processSleepLog(result.rows[0]) });
    }
    catch (error) {
        console.error('Get sleep log error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
app.post('/api/sleep-logs', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { log_date, sleep_score, total_sleep, deep_sleep, rem_sleep, light_sleep, sleep_efficiency, restfulness, source } = req.body;
        if (!log_date) {
            return res.status(400).json({ error: 'log_date is required' });
        }
        // Encrypt numeric fields
        // Note: we store them as encrypted strings in the DB
        const result = await pool.query(`INSERT INTO sleep_logs (user_id, log_date, sleep_score, total_sleep, deep_sleep, rem_sleep, light_sleep, sleep_efficiency, restfulness, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (user_id, log_date)
       DO UPDATE SET 
         sleep_score = $3, total_sleep = $4, deep_sleep = $5, rem_sleep = $6,
         light_sleep = $7, sleep_efficiency = $8, restfulness = $9, source = $10,
         updated_at = now()
       RETURNING *`, [
            userId,
            log_date,
            encrypt(sleep_score),
            encrypt(total_sleep),
            encrypt(deep_sleep),
            encrypt(rem_sleep),
            encrypt(light_sleep),
            encrypt(sleep_efficiency),
            encrypt(restfulness),
            source || 'manual' // source is not sensitive, leaving it plain
        ]);
        res.json({ log: processSleepLog(result.rows[0]) });
    }
    catch (error) {
        console.error('Create/update sleep log error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
app.get('/api/sleep-logs', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        // If limit query param is provided, return list of logs
        if (req.query.limit) {
            const limit = parseInt(req.query.limit) || 7;
            const result = await pool.query('SELECT * FROM sleep_logs WHERE user_id = $1 ORDER BY log_date DESC LIMIT $2', [userId, limit]);
            res.json({ logs: result.rows.map(processSleepLog) });
            return;
        }
        // Otherwise return today's log
        const date = new Date().toISOString().split('T')[0];
        const result = await pool.query('SELECT * FROM sleep_logs WHERE user_id = $1 AND log_date = $2', [userId, date]);
        if (result.rows.length === 0) {
            return res.json({ log: null });
        }
        res.json({ log: processSleepLog(result.rows[0]) });
    }
    catch (error) {
        console.error('Get sleep logs error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
// Oura Integration routes
// POST /api/integrations/oura/connect - Store Oura OAuth token
app.post('/api/integrations/oura/connect', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { access_token, refresh_token, expires_in } = req.body;
        if (!access_token) {
            return res.status(400).json({ error: 'access_token is required' });
        }
        // Calculate expiration time
        const expiresAt = expires_in
            ? new Date(Date.now() + expires_in * 1000)
            : null;
        // Encrypt tokens before storing
        const encryptedAccessToken = encrypt(access_token);
        const encryptedRefreshToken = refresh_token ? encrypt(refresh_token) : null;
        // Store or update Oura token
        await pool.query(`INSERT INTO oura_tokens (user_id, access_token, refresh_token, expires_at, updated_at)
             VALUES ($1, $2, $3, $4, now())
             ON CONFLICT (user_id)
             DO UPDATE SET 
               access_token = $2,
               refresh_token = $3,
               expires_at = $4,
               updated_at = now()`, [userId, encryptedAccessToken, encryptedRefreshToken, expiresAt]);
        res.json({ success: true, message: 'Oura account connected successfully' });
    }
    catch (error) {
        console.error('Connect Oura error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
// POST /api/integrations/oura/sync - Fetch and sync Oura sleep data
app.post('/api/integrations/oura/sync', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { days = 14 } = req.body;
        // Get Oura token for user
        const tokenResult = await pool.query('SELECT access_token, expires_at FROM oura_tokens WHERE user_id = $1', [userId]);
        if (tokenResult.rows.length === 0) {
            return res.status(400).json({ error: 'Oura account not connected' });
        }
        const { access_token: encryptedToken, expires_at } = tokenResult.rows[0];
        // Check if token is expired
        if (expires_at && new Date(expires_at) < new Date()) {
            return res.status(401).json({ error: 'Oura token expired. Please reconnect your account.' });
        }
        // Decrypt access token
        const accessToken = decrypt(encryptedToken);
        if (!accessToken) {
            return res.status(401).json({ error: 'Invalid Oura token. Please reconnect your account.' });
        }
        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];
        // Fetch sleep data from Oura API
        const ouraData = await fetchOuraSleepData(accessToken, startDateStr, endDateStr);
        // Delete existing Oura sleep logs for this date range
        await pool.query(`DELETE FROM sleep_logs 
             WHERE user_id = $1 
             AND source = 'oura' 
             AND log_date >= $2 
             AND log_date <= $3`, [userId, startDateStr, endDateStr]);
        // Convert and insert Oura sleep data
        const sleepLogs = [];
        for (const daily of ouraData.daily) {
            const sleepLog = convertOuraToSleepLog(daily, ouraData.sessions);
            // Only insert if we have meaningful data
            if (sleepLog.sleep_score || sleepLog.total_sleep) {
                await pool.query(`INSERT INTO sleep_logs (
                        user_id, log_date, sleep_score, total_sleep, deep_sleep, 
                        rem_sleep, light_sleep, sleep_efficiency, restfulness, source
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    ON CONFLICT (user_id, log_date)
                    DO UPDATE SET 
                        sleep_score = $3,
                        total_sleep = $4,
                        deep_sleep = $5,
                        rem_sleep = $6,
                        light_sleep = $7,
                        sleep_efficiency = $8,
                        restfulness = $9,
                        source = $10,
                        updated_at = now()`, [
                    userId,
                    sleepLog.log_date,
                    sleepLog.sleep_score !== null ? encrypt(sleepLog.sleep_score.toString()) : null,
                    sleepLog.total_sleep !== null ? encrypt(sleepLog.total_sleep.toString()) : null,
                    sleepLog.deep_sleep !== null ? encrypt(sleepLog.deep_sleep.toString()) : null,
                    sleepLog.rem_sleep !== null ? encrypt(sleepLog.rem_sleep.toString()) : null,
                    sleepLog.light_sleep !== null ? encrypt(sleepLog.light_sleep.toString()) : null,
                    sleepLog.sleep_efficiency !== null ? encrypt(sleepLog.sleep_efficiency.toString()) : null,
                    sleepLog.restfulness !== null ? encrypt(sleepLog.restfulness.toString()) : null,
                    'oura'
                ]);
                sleepLogs.push(sleepLog);
            }
        }
        res.json({
            success: true,
            message: `Synced ${sleepLogs.length} sleep logs from Oura`,
            count: sleepLogs.length
        });
    }
    catch (error) {
        console.error('Sync Oura data error:', error);
        res.status(500).json({ error: error.message || 'Failed to sync Oura data' });
    }
});
// GET /api/integrations/oura/status - Check if Oura is connected
app.get('/api/integrations/oura/status', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const result = await pool.query('SELECT id, expires_at, created_at FROM oura_tokens WHERE user_id = $1', [userId]);
        if (result.rows.length === 0) {
            return res.json({ connected: false });
        }
        const { expires_at } = result.rows[0];
        const isExpired = expires_at && new Date(expires_at) < new Date();
        res.json({
            connected: !isExpired,
            expires_at: expires_at,
            needsRefresh: isExpired
        });
    }
    catch (error) {
        console.error('Get Oura status error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
// DELETE /api/integrations/oura/disconnect - Remove Oura connection
app.delete('/api/integrations/oura/disconnect', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        await pool.query('DELETE FROM oura_tokens WHERE user_id = $1', [userId]);
        // Optionally delete Oura sleep logs
        await pool.query('DELETE FROM sleep_logs WHERE user_id = $1 AND source = $2', [userId, 'oura']);
        res.json({ success: true, message: 'Oura account disconnected' });
    }
    catch (error) {
        console.error('Disconnect Oura error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});
if (process.env.NODE_ENV === 'production') {
    const clientDist = path.resolve(process.cwd(), 'dist');
    app.use(express.static(clientDist));
    app.get('/{*splat}', (req, res) => {
        res.sendFile(path.join(clientDist, 'index.html'));
    });
}
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
