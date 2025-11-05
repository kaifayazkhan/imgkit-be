import { z } from 'zod';
import 'dotenv/config';

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  CORS_ORIGINS: z
    .string()
    .min(1)
    .transform((val) => val.split(',').map((origin) => origin.trim()))
    .pipe(z.array(z.url().or(z.literal('*'))).min(1)),
  BETTER_STACK_SOURCE_TOKEN: z.string().min(1),
  BETTER_STACK_ENDPOINT: z.url(),
  LOG_LEVEL: z.string().default('info'),
  DATABASE_URL: z.string().min(1),
  ACCESS_TOKEN_SECRET: z.string().min(72),
  ACCESS_TOKEN_EXPIRY: z.string().default('15m'),
  REFRESH_TOKEN_SECRET: z.string().min(72),
  REFRESH_TOKEN_EXPIRY: z.string().default('10d'),
  AWS_ACCESS_KEY: z.string().length(20),
  AWS_SECRET_ACCESS_KEY: z.string().length(40),
  AWS_S3_BUCKET_NAME: z.string().min(1),
  AWS_REGION: z.string().min(1),
  IMAGE_DOMAIN: z.string().min(1),
});

export const env = envSchema.parse(process.env);
