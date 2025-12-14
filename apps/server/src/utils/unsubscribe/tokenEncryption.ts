import crypto from 'crypto';
import {env} from '../../env.mjs';

export interface UnsubscribeTokenPayload {
  alertMethodId: string;
  userId: string;
  expiresAt: number; // Unix timestamp
}

export interface EncryptionConfig {
  algorithm: 'aes-256-cbc';
  keyLength: 32; // 256 bits
  ivLength: 16; // 128 bits
}

const ENCRYPTION_CONFIG: EncryptionConfig = {
  algorithm: 'aes-256-cbc',
  keyLength: 32,
  ivLength: 16,
};

/**
 * Encrypts an unsubscribe token payload using AES-256-CBC
 * @param payload The payload to encrypt
 * @returns URL-safe base64 encoded encrypted token
 */
export function encryptUnsubscribeToken(
  payload: UnsubscribeTokenPayload,
): string {
  try {
    // Generate random IV for each encryption
    const iv = crypto.randomBytes(ENCRYPTION_CONFIG.ivLength);

    // Ensure key is exactly 32 bytes
    const key = Buffer.from(
      String(env.UNSUBSCRIBE_ENCRYPTION_KEY).padEnd(32, '0').slice(0, 32),
    );

    // Create cipher
    const cipher = crypto.createCipheriv(ENCRYPTION_CONFIG.algorithm, key, iv);

    // Encrypt the JSON payload
    const payloadJson = JSON.stringify(payload);
    let encrypted = cipher.update(payloadJson, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Combine IV + encrypted data
    const combined = Buffer.concat([iv, Buffer.from(encrypted, 'hex')]);

    // Return URL-safe base64 encoded string
    return combined.toString('base64url');
  } catch (error) {
    throw new Error(`Token encryption failed: ${(error as Error).message}`);
  }
}

/**
 * Decrypts an unsubscribe token and returns the payload
 * @param token URL-safe base64 encoded encrypted token
 * @returns Decrypted payload or null if decryption fails
 */
export function decryptUnsubscribeToken(
  token: string,
): UnsubscribeTokenPayload | null {
  try {
    // Decode from URL-safe base64
    const combined = Buffer.from(token, 'base64url');

    // Extract components
    const iv = combined.subarray(0, ENCRYPTION_CONFIG.ivLength);
    const encrypted = combined.subarray(ENCRYPTION_CONFIG.ivLength);

    // Ensure key is exactly 32 bytes
    const key = Buffer.from(
      String(env.UNSUBSCRIBE_ENCRYPTION_KEY).padEnd(32, '0').slice(0, 32),
    );

    // Create decipher
    const decipher = crypto.createDecipheriv(
      ENCRYPTION_CONFIG.algorithm,
      key,
      iv,
    );

    // Decrypt
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    // Parse JSON payload
    const payload = JSON.parse(decrypted) as UnsubscribeTokenPayload;

    // Validate payload structure
    if (!payload.alertMethodId || !payload.userId || !payload.expiresAt) {
      return null;
    }

    return payload;
  } catch (error) {
    // Return null for any decryption or parsing errors
    return null;
  }
}

/**
 * Generates an expiration timestamp 30 days from now
 * @returns Unix timestamp for 30 days from creation
 */
export function generateExpirationTimestamp(): number {
  const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
  return Date.now() + thirtyDaysInMs;
}

/**
 * Checks if a token payload has expired
 * @param payload The token payload to check
 * @returns True if the token has expired
 */
export function isTokenExpired(payload: UnsubscribeTokenPayload): boolean {
  return Date.now() > payload.expiresAt;
}
