import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from root and local backend .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'umi_user',
  password: process.env.DB_PASSWORD || 'umi_password',
  database: process.env.DB_NAME || 'umi_live',
  waitForConnections: process.env.DB_WAIT_FOR_CONNECTIONS !== 'false',
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '20', 10),
  queueLimit: parseInt(process.env.DB_QUEUE_LIMIT || '0', 10),
  enableKeepAlive: process.env.DB_ENABLE_KEEP_ALIVE !== 'false',
  keepAliveInitialDelay: parseInt(process.env.DB_KEEP_ALIVE_DELAY || '10000', 10),
};

let pool;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
}

export const poolProxy = {
  getConnection: () => getPool().getConnection(),
  execute: (...args) => getPool().execute(...args),
  query: (...args) => getPool().query(...args),
};

export { poolProxy as pool };

export async function query(sql, params) {
  const connection = getPool();
  const [rows, fields] = await connection.execute(sql, params);
  return rows;
}

export async function testConnection() {
  try {
    const connection = await getPool().getConnection();
    await connection.ping();
    connection.release();
    return true;
  } catch (err) {
    console.error('MySQL connection check failed:', err.message);
    return false;
  }
}

export default {
  getPool,
  query,
  testConnection,
};
