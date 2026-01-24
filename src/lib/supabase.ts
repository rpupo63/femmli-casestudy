// Type definitions for the application
// Note: This file no longer uses Supabase, but keeps the type definitions

export interface CaffeineEntry {
  time: string;
  amount: number;
  type: string;
}

export interface CaffeineLog {
  id: string;
  user_id: string;
  log_date: string;
  entries: CaffeineEntry[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SleepLog {
  id: string;
  user_id: string;
  log_date: string;
  sleep_score?: number;
  total_sleep?: number;
  deep_sleep?: number;
  rem_sleep?: number;
  light_sleep?: number;
  sleep_efficiency?: number;
  restfulness?: number;
  source: string;
  created_at: string;
  updated_at: string;
}
