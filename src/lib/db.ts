import { Pool, QueryResult } from 'pg';

let pool: Pool;

if (!global._postgresPool) {
  global._postgresPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
    max: 10, // maximum number of clients in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
}

pool = global._postgresPool;

export default pool;

export async function query(text: string, params?: any[]): Promise<QueryResult> {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  // console.log('executed query', { text, duration, rows: res.rowCount });
  return res;
}

// Support for hot reloading in Next.js development mode
declare global {
  var _postgresPool: Pool | undefined;
}
