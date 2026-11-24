import { z } from 'zod';

import { legacyPinSchema, passwordMinimumLength, passwordSchema } from './authPolicy';
import { userRoleSchema } from './user';

export const loginSchema = z.object({
  username: z.string().min(1),
  // A current password, or the old PIN on the one-time upgrade path.
  password: z.string().superRefine((value, ctx) => {
    if (passwordSchema.safeParse(value).success || legacyPinSchema.safeParse(value).success) {
      return;
    }
    ctx.addIssue({
      code: 'custom',
      message: `Use a password of at least ${passwordMinimumLength} characters, or your current 4–6 digit PIN`,
    });
  }),
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
  user: authUserSchema,
});
export type LoginResponse = z.infer<typeof loginResponseSchema>;

export const upgradePasswordSchema = z.object({
  password: passwordSchema,
});
export type UpgradePassword = z.infer<typeof upgradePasswordSchema>;

export const registerSchema = z.object({
  shopName: z.string().min(1, 'shop name is required'),
  ownerName: z.string().min(1, 'your name is required'),
  username: z.string().min(3, 'username must be at least 3 characters'),
  password: passwordSchema,
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
