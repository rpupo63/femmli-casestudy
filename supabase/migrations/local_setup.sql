/*
  # Local Postgres Setup for Caffeine and Sleep Tracking
  
  This is a local-friendly version of the migration that:
  1. Creates a simple users table (if you don't have one)
  2. Creates the caffeine_logs and sleep_logs tables
  3. Sets up basic indexes
  
  Note: RLS policies are commented out since auth.uid() won't work locally.
  You can manage access control at the application level instead.
*/

-- Create a simple users table if it doesn't exist
-- Remove this section if you already have a users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add password_hash column if it doesn't exist (for existing databases)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE users ADD COLUMN password_hash text;
    -- Note: Existing users will need to sign up again or reset their password
    -- For now, we'll allow NULL temporarily, but new users must have password_hash
    -- You may want to delete existing users or set a migration path
  END IF;
END $$;

-- Create caffeine_logs table
CREATE TABLE IF NOT EXISTS caffeine_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
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
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
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

-- Note: RLS is disabled for local development
-- Uncomment and modify these if you want to enable RLS locally
-- ALTER TABLE caffeine_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sleep_logs ENABLE ROW LEVEL SECURITY;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_caffeine_logs_user_date ON caffeine_logs(user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_sleep_logs_user_date ON sleep_logs(user_id, log_date DESC);

-- Create oura_tokens table to store OAuth tokens
CREATE TABLE IF NOT EXISTS oura_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_oura_tokens_user_id ON oura_tokens(user_id);
