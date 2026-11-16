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
let readPool;

// Optional read replica: set DB_READ_HOST (and optionally DB_READ_PORT/USER/PASSWORD/CONNECTION_LIMIT).
// Unset = reads go to the primary, so nothing changes until a replica exists.
const readEnabled = Boolean(process.env.DB_READ_HOST);
function getReadPool() {
  if (!readEnabled) return getPool();
  if (!readPool) {
    readPool = mysql.createPool({
      ...dbConfig,
      host: process.env.DB_READ_HOST,
      port: parseInt(process.env.DB_READ_PORT || String(dbConfig.port), 10),
      user: process.env.DB_READ_USER || dbConfig.user,
      password: process.env.DB_READ_PASSWORD || dbConfig.password,
      connectionLimit: parseInt(process.env.DB_READ_CONNECTION_LIMIT || String(dbConfig.connectionLimit), 10),
    });
  }
  return readPool;
}

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

/**
 * Read-only query that may be served by a replica (replication lag: usually < 1s).
 * Use ONLY for data where slightly stale is fine (feeds, lists, leaderboards) - never for
 * read-your-own-write flows, wallet balances, or anything feeding a decision that mutates data.
 * Falls back to the primary if the replica errors.
 */
export async function queryRead(sql, params) {
  if (!readEnabled) return query(sql, params);
  try {
    const [rows] = await getReadPool().execute(sql, params);
    return rows;
  } catch (err) {
    console.warn(`[DB] read replica failed (${err.code || err.message}); falling back to primary.`);
    return query(sql, params);
  }
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

export async function closePool() {
  if (pool) {
    const p = pool;
    pool = undefined;
    await p.end();
  }
  if (readPool) {
    const rp = readPool;
    readPool = undefined;
    await rp.end();
  }
}

export default {
  queryRead,
  closePool,
  getPool,
  query,
  testConnection,
};
