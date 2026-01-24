import pool from './db';
import bcrypt from 'bcryptjs';
import { encrypt } from './lib/crypto';

interface CaffeineEntry {
  time: string;
  amount: number;
  type: string;
}

// Generate correlated sleep score based on caffeine amount
function generateCorrelatedSleepScore(caffeineAmount: number): number {
  if (caffeineAmount < 100) {
    return Math.floor(85 + Math.random() * 10);
  } else if (caffeineAmount < 200) {
    return Math.floor(75 + Math.random() * 15);
  } else if (caffeineAmount < 300) {
    return Math.floor(65 + Math.random() * 15);
  } else {
    return Math.floor(55 + Math.random() * 15);
  }
}

// Generate mock sleep data (correlated with caffeine)
function generateMockSleepData(
  days: number = 30,
  userId: string,
  caffeineMap?: Map<string, number>
) {
  const mockLogs: any[] = [];
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
function generateMockCaffeineEntries(totalCaffeine: number): CaffeineEntry[] {
  const entries: CaffeineEntry[] = [];
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

  const amounts: Record<string, number> = {
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
    let type: string;
    if (hour < 12) {
      type = Math.random() > 0.3 ? 'Coffee (8oz)' : 'Black Tea';
    } else if (hour < 17) {
      type = Math.random() > 0.5 ? 'Coffee (8oz)' : 'Green Tea';
    } else {
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
function generateMockCaffeineData(days: number = 30, userId: string) {
  const mockLogs: any[] = [];
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

    mockLogs.push({
      user_id: userId,
      log_date: dateString,
      entries: entries,
      notes: null
    });
  }

  return mockLogs;
}

async function seed() {
  try {
    console.log('🌱 Starting database seed...');

    // Create or get test user
    const testEmail = 'test@example.com';
    const testPassword = 'test123';

    // Check if user exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [testEmail]);

    let userId: string;

    if (existingUser.rows.length > 0) {
      userId = existingUser.rows[0].id;
      console.log(`✅ Using existing user: ${testEmail} (${userId})`);
    } else {
      // Create new user
      const passwordHash = await bcrypt.hash(testPassword, 10);
      const result = await pool.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
        [testEmail, passwordHash]
      );
      userId = result.rows[0].id;
      console.log(`✅ Created test user: ${testEmail} (${userId})`);
    }

    // Clear existing data for this user
    await pool.query('DELETE FROM sleep_logs WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM caffeine_logs WHERE user_id = $1', [userId]);
    console.log('🧹 Cleared existing mock data');

    // Generate caffeine data first (so we can correlate sleep scores)
    const caffeineData = generateMockCaffeineData(30, userId);
    console.log(`☕ Generating ${caffeineData.length} caffeine log entries...`);

    // Create a map of caffeine totals by date for sleep correlation
    const caffeineMap = new Map<string, number>();
    for (const log of caffeineData) {
      const total = log.entries.reduce((sum: number, entry: CaffeineEntry) => sum + entry.amount, 0);
      caffeineMap.set(log.log_date, total);

      await pool.query(
        `INSERT INTO caffeine_logs (user_id, log_date, entries, notes)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, log_date)
         DO UPDATE SET 
           entries = EXCLUDED.entries,
           notes = EXCLUDED.notes,
           updated_at = now()`,
        [
          log.user_id, 
          log.log_date, 
          encrypt(JSON.stringify(log.entries)), 
          encrypt(log.notes)
        ]
      );
    }
    console.log('✅ Inserted caffeine logs');

    // Generate and insert sleep data (correlated with caffeine)
    const sleepData = generateMockSleepData(30, userId, caffeineMap);
    console.log(`📊 Generating ${sleepData.length} sleep log entries (correlated with caffeine)...`);

    for (const log of sleepData) {
      await pool.query(
        `INSERT INTO sleep_logs (
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
          updated_at = now()`,
        [
          log.user_id,
          log.log_date,
          encrypt(log.sleep_score),
          encrypt(log.total_sleep),
          encrypt(log.deep_sleep),
          encrypt(log.rem_sleep),
          encrypt(log.light_sleep),
          encrypt(log.sleep_efficiency),
          encrypt(log.restfulness),
          log.source
        ]
      );
    }
    console.log('✅ Inserted sleep logs');

    console.log('\n🎉 Database seed completed successfully!');
    console.log(`\nTest user credentials:`);
    console.log(`  Email: ${testEmail}`);
    console.log(`  Password: ${testPassword}`);

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    await pool.end();
    process.exit(1);
  }
}

seed();
