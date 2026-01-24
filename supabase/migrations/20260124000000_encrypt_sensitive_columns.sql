-- Change caffeine_logs columns to support encryption
ALTER TABLE caffeine_logs 
  ALTER COLUMN entries TYPE text,
  ALTER COLUMN notes TYPE text;

-- Change sleep_logs columns to support encryption (integers to text)
ALTER TABLE sleep_logs
  ALTER COLUMN sleep_score TYPE text,
  ALTER COLUMN total_sleep TYPE text,
  ALTER COLUMN deep_sleep TYPE text,
  ALTER COLUMN rem_sleep TYPE text,
  ALTER COLUMN light_sleep TYPE text,
  ALTER COLUMN sleep_efficiency TYPE text,
  ALTER COLUMN restfulness TYPE text;
