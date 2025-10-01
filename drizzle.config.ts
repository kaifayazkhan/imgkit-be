import { defineConfig } from 'drizzle-kit';
// @ts-ignore
import { env } from './src/config/env';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  verbose: true,
  dialect: 'postgresql',
  strict: true,
});
