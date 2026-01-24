-- Create oura_tokens table to store OAuth tokens
CREATE TABLE IF NOT EXISTS oura_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- Encrypted in app layer before insert: format "iv:tag:ciphertext"
  access_token text NOT NULL,
  -- Encrypted in app layer before insert: format "iv:tag:ciphertext"
  refresh_token text,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_oura_tokens_user_id ON oura_tokens(user_id);
