/*
  # Caffeine and Sleep Tracking Schema

  1. New Tables
    - `caffeine_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, reference to auth.users)
      - `log_date` (date) - the date this log is for
      - `entries` (jsonb) - array of caffeine entries with time and amount
      - `notes` (text) - optional notes
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `sleep_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, reference to auth.users)
      - `log_date` (date) - the date/night of sleep
      - `sleep_score` (integer) - overall sleep score (0-100)
      - `total_sleep` (integer) - total sleep in minutes
      - `deep_sleep` (integer) - deep sleep in minutes
      - `rem_sleep` (integer) - REM sleep in minutes
      - `light_sleep` (integer) - light sleep in minutes
      - `sleep_efficiency` (integer) - efficiency percentage
      - `restfulness` (integer) - restfulness score (0-100)
      - `source` (text) - 'oura', 'apple_watch', 'manual', etc.
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create caffeine_logs table
CREATE TABLE IF NOT EXISTS caffeine_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date date NOT NULL,
  entries jsonb DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, log_date)
);

-- Create sleep_logs table
CREATE TABLE IF NOT EXISTS sleep_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date date NOT NULL,
  sleep_score integer,
  total_sleep integer,
  deep_sleep integer,
  rem_sleep integer,
  light_sleep integer,
  sleep_efficiency integer,
  restfulness integer,
  source text DEFAULT 'manual',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, log_date)
);

-- Enable RLS
ALTER TABLE caffeine_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_logs ENABLE ROW LEVEL SECURITY;

-- Caffeine logs policies
CREATE POLICY "Users can view own caffeine logs"
  ON caffeine_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own caffeine logs"
  ON caffeine_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own caffeine logs"
  ON caffeine_logs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own caffeine logs"
  ON caffeine_logs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Sleep logs policies
CREATE POLICY "Users can view own sleep logs"
  ON sleep_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sleep logs"
  ON sleep_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sleep logs"
  ON sleep_logs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sleep logs"
  ON sleep_logs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_caffeine_logs_user_date ON caffeine_logs(user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_sleep_logs_user_date ON sleep_logs(user_id, log_date DESC);
