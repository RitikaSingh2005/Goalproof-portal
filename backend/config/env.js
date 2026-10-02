import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root if present
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = parseInt(process.env.PORT, 10) || 5000;
const DATABASE_URL = process.env.DATABASE_URL || 'file:./dev.db';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.trim() : null;

let JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  if (NODE_ENV === 'test') {
    JWT_SECRET = 'goalproof-test-jwt-secret-key-32-chars-long';
  } else {
    console.error('FATAL CONFIGURATION ERROR: JWT_SECRET environment variable is required.');
    console.error('Please configure JWT_SECRET in your backend/.env file before starting the server.');
    process.exit(1);
  }
}

export {
  PORT,
  DATABASE_URL,
  JWT_SECRET,
  OPENAI_API_KEY,
  NODE_ENV
};
