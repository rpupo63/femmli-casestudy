import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// Use a fixed key for the case study if env var is missing.
// In a real app, this MUST be in the environment variables.
// Default key for demo purposes only.
const ENCRYPTION_KEY_HEX = process.env.ENCRYPTION_KEY || 'a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890'; 

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Recommended IV length for GCM is 12 bytes (96 bits)

if (ENCRYPTION_KEY_HEX.length !== 64) {
    console.error(`[Crypto] Error: ENCRYPTION_KEY must be a 64-character hex string (32 bytes). Current length: ${ENCRYPTION_KEY_HEX.length}`);
    // Fallback to a valid length key for stability if the env var is just wrong
}

const getKey = () => {
    // Ensure we have a valid buffer, truncating or padding if strictly necessary for the demo to not crash,
    // but effectively we rely on the constant or env var being correct.
    const key = Buffer.from(ENCRYPTION_KEY_HEX, 'hex');
    if (key.length !== 32) {
        throw new Error('Invalid ENCRYPTION_KEY length');
    }
    return key;
};

export const encrypt = (text: string | null | undefined): string | null => {
  if (text === null || text === undefined) return null;
  // If it's already a string, great. If not, we should probably stringify it before calling this, 
  // but to be safe let's ensure it's a string.
  const stringText = String(text);

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  
  let encrypted = cipher.update(stringText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  // Format: iv:tag:content
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
};

export const decrypt = (text: string | null | undefined): string | null => {
  if (text === null || text === undefined) return null;
  
  const parts = text.split(':');
  // Simple check to see if it matches our format
  if (parts.length !== 3) {
      // Return original text if it doesn't look like our encrypted format
      // This helps with migration or mixed states
      return text;
  }
  
  try {
      const iv = Buffer.from(parts[0], 'hex');
      const tag = Buffer.from(parts[1], 'hex');
      const encryptedText = parts[2];
      
      const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
  } catch (error) {
      console.error('Decryption failed:', error);
      // Fallback: return original text (in case it wasn't actually encrypted but happened to have colons)
      return text;
  }
};
