import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email('validation.email'),
  password: z.string().min(1, 'validation.password'),
});

export type LoginInput = z.infer<typeof loginSchema>;
