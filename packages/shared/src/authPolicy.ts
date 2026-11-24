import { z } from 'zod';

// One place for sign-in limits. Call sites import these names.

export const passwordMinimumLength = 10;
export const failedLoginLimit = 5;
export const lockoutMinutes = 15;
export const sessionTtlHours = 12;
export const sessionTtl = `${sessionTtlHours}h`;
export const sessionTtlMs = sessionTtlHours * 60 * 60 * 1000;
export const upgradeTtlMinutes = 10;
export const bcryptSaltRounds = 10;
export const sessionCookieName = 'shop_session';
export const upgradeCookieName = 'shop_password_upgrade';

// A password is long enough and not a PIN wearing a longer coat.
export const passwordSchema = z
  .string()
  .min(passwordMinimumLength, `Password must be at least ${passwordMinimumLength} characters`)
  .refine((value) => !/^\d+$/.test(value), 'Password cannot be only digits');

// Old accounts still know a 4–6 digit PIN. Login accepts it once so they can set a password.
export const legacyPinSchema = z.string().regex(/^\d{4,6}$/);
