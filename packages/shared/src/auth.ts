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

export const registerSchema = z.object({
  shopName: z.string().min(1, 'shop name is required'),
  ownerName: z.string().min(1, 'your name is required'),
  username: z.string().min(3, 'username must be at least 3 characters'),
  pin: z.string().regex(/^\d{6}$/, 'PIN must be 6 digits'),
});
export type Register = z.infer<typeof registerSchema>;

// Registration logs the new owner straight in, so its response is the login shape.
export const registerResponseSchema = loginResponseSchema;
export type RegisterResponse = z.infer<typeof registerResponseSchema>;

// One social sign-in button. The API only lists providers whose credentials are
// configured, so the web app renders whatever comes back and nothing when it's empty.
export const oauthProviderSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
});
export type OAuthProvider = z.infer<typeof oauthProviderSchema>;
