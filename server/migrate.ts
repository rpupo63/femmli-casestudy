import { readFileSync } from 'fs';
import { Pool } from 'pg';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const isProduction = process.env.NODE_ENV === 'production';

if (!connectionString) {
    console.log('⚠️  No DATABASE_URL found, skipping migrations');
    process.exit(0);
}

const pool = new Pool({
    connectionString,
    ssl: isProduction ? { rejectUnauthorized: false } : undefined,
});

async function migrate() {
    console.log('🗄️  Running database migrations...');

    try {
        const migrationPath = path.join(process.cwd(), 'supabase/migrations/local_setup.sql');
        const sql = readFileSync(migrationPath, 'utf-8');

        await pool.query(sql);

        console.log('✅ Migrations completed successfully');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

migrate();
