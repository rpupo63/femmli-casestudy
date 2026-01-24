import pool from './server/db.ts';

async function checkData() {
  try {
    const result = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM caffeine_logs) as caffeine_count,
        (SELECT COUNT(*) FROM sleep_logs) as sleep_count,
        (SELECT COUNT(*) FROM users) as user_count
    `);
    console.log('Database stats:', result.rows[0]);
    
    const caffeineSample = await pool.query('SELECT log_date, entries FROM caffeine_logs LIMIT 3');
    console.log('\nSample caffeine logs:', caffeineSample.rows);
    
    const sleepSample = await pool.query('SELECT log_date, sleep_score FROM sleep_logs LIMIT 3');
    console.log('\nSample sleep logs:', sleepSample.rows);
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkData();
