import { CaffeineEntry, SleepLog } from './supabase';

interface DemoDayData {
  date: string;
  caffeine: number;
  sleepScore: number;
  entries: CaffeineEntry[];
  sleepLog: SleepLog;
}

export function generateMockHealthData(): DemoDayData[] {
  const data: DemoDayData[] = [];
  const today = new Date();
  
  // Generate 14 days of data
  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateString = date.toISOString().split('T')[0];
    
    // 1. Generate Caffeine Data
    // Create a pattern: Weekdays might be higher, weekends lower, or random high/low days
    // Let's make it vary to show the correlation clearly.
    // Days 0-4: Low caffeine (High sleep)
    // Days 5-9: High caffeine (Low sleep)
    // Days 10-13: Mixed
    
    let totalCaffeine = 0;
    const entries: CaffeineEntry[] = [];
    
    // Determine target caffeine for the day to create nice correlation
    let targetCaffeine = 0;
    const randomVal = Math.random();
    
    if (i < 5) {
       // Recent days: Low caffeine (0 - 100mg)
       targetCaffeine = Math.floor(Math.random() * 100);
    } else if (i < 10) {
       // Last week: High caffeine (250 - 450mg)
       targetCaffeine = 250 + Math.floor(Math.random() * 200);
    } else {
       // Older days: Moderate (100 - 250mg)
       targetCaffeine = 100 + Math.floor(Math.random() * 150);
    }
    
    // Generate specific entries to match target
    if (targetCaffeine > 0) {
      // Morning Coffee
      const morningAmt = Math.min(targetCaffeine, 120 + Math.floor(Math.random() * 40));
      entries.push({
        time: '08:30',
        amount: morningAmt,
        type: 'Drip Coffee'
      });
      totalCaffeine += morningAmt;
      
      // Afternoon refill if needed
      if (totalCaffeine < targetCaffeine) {
        const remaining = targetCaffeine - totalCaffeine;
        entries.push({
          time: '14:00',
          amount: remaining,
          type: remaining > 80 ? 'Cold Brew' : 'Green Tea'
        });
        totalCaffeine += remaining;
      }
    }

    // 2. Calculate Sleep Score based on Caffeine (Inverse Correlation)
    // Base 95, lose 1 point for every 10mg over 50mg
    let sleepPenalty = 0;
    if (totalCaffeine > 50) {
      sleepPenalty = (totalCaffeine - 50) / 8; 
    }
    
    // Add some randomness
    const noise = (Math.random() * 10) - 5;
    let sleepScore = Math.round(95 - sleepPenalty + noise);
    
    // Clamp
    sleepScore = Math.max(40, Math.min(98, sleepScore));

    // 3. Generate detailed Sleep Log
    const totalSleepHours = 6 + (sleepScore / 100) * 3; // 6 to 9 hours
    const deepSleepHours = (sleepScore / 100) * 2; // up to 2 hours
    const remSleepHours = (sleepScore / 100) * 2.5; // up to 2.5 hours
    
    const sleepLog: SleepLog = {
      id: `demo-sleep-${i}`,
      user_id: 'demo-user',
      log_date: dateString,
      sleep_score: sleepScore,
      total_sleep: parseFloat(totalSleepHours.toFixed(2)),
      deep_sleep: parseFloat(deepSleepHours.toFixed(2)),
      rem_sleep: parseFloat(remSleepHours.toFixed(2)),
      light_sleep: parseFloat((totalSleepHours - deepSleepHours - remSleepHours).toFixed(2)),
      sleep_efficiency: Math.round(85 + (sleepScore / 100) * 10),
      restfulness: Math.round(sleepScore), // correlation
      source: 'demo_oura', // Explicitly mark as demo source
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    data.push({
      date: dateString,
      caffeine: totalCaffeine,
      sleepScore: sleepScore,
      entries: entries,
      sleepLog: sleepLog
    });
  }
  
  // Sort by date ascending for the chart
  return data.sort((a, b) => a.date.localeCompare(b.date));
}
