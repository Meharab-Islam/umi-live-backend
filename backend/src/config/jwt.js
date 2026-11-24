import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from root and local backend .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'umi_live_super_secret_jwt_key_2026_xYz987!';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_ISSUER = process.env.JWT_ISSUER || process.env.PROJECT_NAME || 'umi';

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: JWT_ISSUER,
    // Unique id per login: two logins in the same second must never yield the same token,
    // otherwise the single-device check could not tell the devices apart.
    jwtid: randomUUID(),
  });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
    });
  } catch (err) {
    // Fallback without issuer check for backward compatibility
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch {
      return null;
    }
  }
}

export default {
  signToken,
  verifyToken,
};
