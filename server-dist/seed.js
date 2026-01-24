import pool from './db';
import bcrypt from 'bcryptjs';
import { encrypt } from './lib/crypto';
// Example users with realistic data
const EXAMPLE_USERS = [
    { email: 'test@example.com', password: 'test123', name: 'Test User' },
    { email: 'sarah.johnson@demo.com', password: 'demo456', name: 'Sarah Johnson' },
    { email: 'mike.chen@demo.com', password: 'demo789', name: 'Mike Chen' },
    { email: 'emma.wilson@demo.com', password: 'demo321', name: 'Emma Wilson' },
    { email: 'alex.garcia@demo.com', password: 'demo654', name: 'Alex Garcia' },
];
// Realistic caffeine notes
const CAFFEINE_NOTES = [
    'Had an extra cup today due to early meeting',
    'Trying to cut back this week',
    'Switched to decaf after 2pm',
    'Feeling tired, needed the extra boost',
    'Great sleep last night, less caffeine needed',
    'Stressful day at work',
    'Weekend relaxation mode',
    'Pre-workout coffee',
    'Cold brew instead of regular today',
    'Treating myself to a fancy latte',
    null, null, null, null, null, // Some days without notes
];
// Generate correlated sleep score based on caffeine amount
function generateCorrelatedSleepScore(caffeineAmount) {
    if (caffeineAmount < 100) {
        return Math.floor(85 + Math.random() * 10);
    }
    else if (caffeineAmount < 200) {
        return Math.floor(75 + Math.random() * 15);
    }
    else if (caffeineAmount < 300) {
        return Math.floor(65 + Math.random() * 15);
    }
    else {
        return Math.floor(55 + Math.random() * 15);
    }
}
// Generate mock sleep data (correlated with caffeine)
function generateMockSleepData(days = 30, userId, caffeineMap) {
    const mockLogs = [];
    const today = new Date();
    for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        // Use correlated sleep score if caffeine data is available
        const caffeineTotal = caffeineMap?.get(dateString) || 0;
        const sleepScore = caffeineMap
            ? generateCorrelatedSleepScore(caffeineTotal)
            : Math.floor(70 + Math.random() * 25);
        const totalSleep = Math.floor(360 + Math.random() * 120);
        const deepSleep = Math.floor(totalSleep * (0.15 + Math.random() * 0.1));
        const remSleep = Math.floor(totalSleep * (0.2 + Math.random() * 0.1));
        const lightSleep = totalSleep - deepSleep - remSleep;
        const efficiency = Math.floor(85 + Math.random() * 12);
        const restfulness = Math.floor(65 + Math.random() * 30);
        mockLogs.push({
            user_id: userId,
            log_date: dateString,
            sleep_score: sleepScore,
            total_sleep: totalSleep,
            deep_sleep: deepSleep,
            rem_sleep: remSleep,
            light_sleep: lightSleep,
            sleep_efficiency: efficiency,
            restfulness: restfulness,
            source: 'oura'
        });
    }
    return mockLogs;
}
// Generate mock caffeine entries
function generateMockCaffeineEntries(totalCaffeine) {
    const entries = [];
    const numEntries = Math.floor(Math.random() * 3) + 1;
    let remaining = totalCaffeine;
    const types = [
        'Coffee (8oz)',
        'Coffee (12oz)',
        'Coffee (16oz)',
        'Espresso Shot',
        'Double Espresso',
        'Latte',
        'Black Tea',
        'Green Tea',
        'Energy Drink',
        'Cola'
    ];
    const amounts = {
        'Coffee (8oz)': 95,
        'Coffee (12oz)': 140,
        'Coffee (16oz)': 190,
        'Espresso Shot': 64,
        'Double Espresso': 128,
        'Latte': 75,
        'Black Tea': 47,
        'Green Tea': 28,
        'Energy Drink': 80,
        'Cola': 34
    };
    for (let i = 0; i < numEntries; i++) {
        const hour = 7 + i * 4 + Math.floor(Math.random() * 3);
        const time = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';
        const amount = i === numEntries - 1
            ? remaining
            : Math.floor(remaining / (numEntries - i) * (0.5 + Math.random()));
        // Select a type based on time of day
        let type;
        if (hour < 12) {
            type = Math.random() > 0.3 ? 'Coffee (8oz)' : 'Black Tea';
        }
        else if (hour < 17) {
            type = Math.random() > 0.5 ? 'Coffee (8oz)' : 'Green Tea';
        }
        else {
            type = Math.random() > 0.7 ? 'Cola' : 'Green Tea';
        }
        entries.push({
            time,
            amount: Math.max(amount, 20),
            type
        });
        remaining -= amount;
    }
    return entries;
}
// Generate mock caffeine data
function generateMockCaffeineData(days = 30, userId) {
    const mockLogs = [];
    const today = new Date();
    for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const baseCaffeine = isWeekend ? 120 : 180;
        const variation = Math.random() * 180;
        const total = Math.floor(baseCaffeine + variation);
        const entries = generateMockCaffeineEntries(total);
        // Add a random note sometimes
        const note = CAFFEINE_NOTES[Math.floor(Math.random() * CAFFEINE_NOTES.length)];
        mockLogs.push({
            user_id: userId,
            log_date: dateString,
            entries: entries,
            notes: note
        });
    }
    return mockLogs;
}
// Generate fake Oura tokens (these are example tokens, not real)
function generateFakeOuraTokens() {
    const fakeAccessToken = `oura_at_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const fakeRefreshToken = `oura_rt_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    return { accessToken: fakeAccessToken, refreshToken: fakeRefreshToken, expiresAt };
}
async function seedUserData(userId, userEmail, hasOuraIntegration) {
    // Clear existing data for this user
    await pool.query('DELETE FROM sleep_logs WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM caffeine_logs WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM oura_tokens WHERE user_id = $1', [userId]);
    // Generate caffeine data first (so we can correlate sleep scores)
    const caffeineData = generateMockCaffeineData(30, userId);
    // Create a map of caffeine totals by date for sleep correlation
    const caffeineMap = new Map();
    for (const log of caffeineData) {
        const total = log.entries.reduce((sum, entry) => sum + entry.amount, 0);
        caffeineMap.set(log.log_date, total);
        await pool.query(`INSERT INTO caffeine_logs (user_id, log_date, entries, notes)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, log_date)
       DO UPDATE SET
         entries = EXCLUDED.entries,
         notes = EXCLUDED.notes,
         updated_at = now()`, [
            log.user_id,
            log.log_date,
            encrypt(JSON.stringify(log.entries)),
            encrypt(log.notes)
        ]);
    }
    // Generate and insert sleep data (correlated with caffeine)
    const sleepData = generateMockSleepData(30, userId, caffeineMap);
    for (const log of sleepData) {
        await pool.query(`INSERT INTO sleep_logs (
        user_id, log_date, sleep_score, total_sleep, deep_sleep,
        rem_sleep, light_sleep, sleep_efficiency, restfulness, source
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (user_id, log_date)
      DO UPDATE SET
        sleep_score = EXCLUDED.sleep_score,
        total_sleep = EXCLUDED.total_sleep,
        deep_sleep = EXCLUDED.deep_sleep,
        rem_sleep = EXCLUDED.rem_sleep,
        light_sleep = EXCLUDED.light_sleep,
        sleep_efficiency = EXCLUDED.sleep_efficiency,
        restfulness = EXCLUDED.restfulness,
        source = EXCLUDED.source,
        updated_at = now()`, [
            log.user_id,
            log.log_date,
            encrypt(log.sleep_score.toString()),
            encrypt(log.total_sleep.toString()),
            encrypt(log.deep_sleep.toString()),
            encrypt(log.rem_sleep.toString()),
            encrypt(log.light_sleep.toString()),
            encrypt(log.sleep_efficiency.toString()),
            encrypt(log.restfulness.toString()),
            hasOuraIntegration ? 'oura' : 'manual'
        ]);
    }
    // Add Oura tokens for users with integration (encrypted)
    if (hasOuraIntegration) {
        const tokens = generateFakeOuraTokens();
        await pool.query(`INSERT INTO oura_tokens (user_id, access_token, refresh_token, expires_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id)
       DO UPDATE SET
         access_token = EXCLUDED.access_token,
         refresh_token = EXCLUDED.refresh_token,
         expires_at = EXCLUDED.expires_at,
         updated_at = now()`, [
            userId,
            encrypt(tokens.accessToken),
            encrypt(tokens.refreshToken),
            tokens.expiresAt
        ]);
    }
    return { caffeineCount: caffeineData.length, sleepCount: sleepData.length };
}
async function seed() {
    try {
        console.log('🌱 Starting database seed...\n');
        const userIds = [];
        // Create all example users (always update password hash to ensure login works)
        for (const user of EXAMPLE_USERS) {
            const passwordHash = await bcrypt.hash(user.password, 10);
            const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [user.email]);
            let userId;
            if (existingUser.rows.length > 0) {
                userId = existingUser.rows[0].id;
                // Update password hash to ensure it matches expected credentials
                await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);
                console.log(`✅ Updated existing user: ${user.email}`);
            }
            else {
                const result = await pool.query('INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id', [user.email, passwordHash]);
                userId = result.rows[0].id;
                console.log(`✅ Created user: ${user.email}`);
            }
            userIds.push({ email: user.email, password: user.password, id: userId });
        }
        console.log('\n🧹 Clearing existing mock data and seeding fresh data...\n');
        // Seed data for each user
        for (let i = 0; i < userIds.length; i++) {
            const user = userIds[i];
            // Give Oura integration to first 3 users
            const hasOura = i < 3;
            const stats = await seedUserData(user.id, user.email, hasOura);
            console.log(`  📊 ${user.email}: ${stats.caffeineCount} caffeine logs, ${stats.sleepCount} sleep logs${hasOura ? ', Oura connected' : ''}`);
        }
        console.log('\n🎉 Database seed completed successfully!');
        console.log('\n📋 Example user credentials:');
        console.log('─'.repeat(50));
        for (const user of userIds) {
            console.log(`  Email: ${user.email}`);
            console.log(`  Password: ${EXAMPLE_USERS.find(u => u.email === user.email)?.password}`);
            console.log('');
        }
        await pool.end();
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Error seeding database:', error);
        await pool.end();
        process.exit(1);
    }
}
seed();
