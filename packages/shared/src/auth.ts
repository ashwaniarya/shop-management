import { z } from 'zod';

import { userRoleSchema } from './user';

export const loginSchema = z.object({
  username: z.string().min(1),
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4–6 digits'),
});
export type Login = z.infer<typeof loginSchema>;

export const authUserSchema = z.object({
  id: z.number().int(),
  shopId: z.number().int(),
  name: z.string(),
  role: userRoleSchema,
});
export type AuthUser = z.infer<typeof authUserSchema>;

export const loginResponseSchema = z.object({
  token: z.string(),
  user: authUserSchema,
});
export type LoginResponse = z.infer<typeof loginResponseSchema>;
