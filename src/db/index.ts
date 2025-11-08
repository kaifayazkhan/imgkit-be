import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '../config/env.js';
import logger from '../config/logger.js';

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected database pool error');
});

const db = drizzle(pool, {
  logger: env.NODE_ENV !== 'production' && {
    logQuery(query, params) {
      logger.debug(
        {
          query,
          params,
        },
        'DB query'
      );
    },
  },
});

export { db, pool };
