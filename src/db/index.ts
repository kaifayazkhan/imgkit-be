import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import { env } from '../config/env.js';
import * as schema from './schema.js';

const db = drizzle(env.DATABASE_URL, { logger: true, schema: schema });

export { db };
