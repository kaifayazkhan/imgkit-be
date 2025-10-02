import { z } from 'zod';

export const RegisterUserSchema = z.object({
  name: z.string(),
  email: z.email().toLowerCase(),
  password: z.string().min(8),
});

export const LoginUserSchema = z.object({
  email: z.email().toLowerCase(),
  password: z.string().min(8),
});
