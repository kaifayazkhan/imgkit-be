import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import { env } from '../config/env.js';
import * as schema from './schema.js';
import logger from '../config/logger.js';

const db = drizzle(env.DATABASE_URL, {
  schema,
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

export { db };
