import type { CookieOptions } from 'express';

import { sessionCookieName, sessionTtlMs, upgradeCookieName, upgradeTtlMinutes } from '@shop/shared';

export { sessionCookieName, upgradeCookieName };

// Same flags as the OAuth cookies: the page script cannot read the session.
function cookieOptions(maxAge: number): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  };
}

export function sessionCookieOptions(): CookieOptions {
  return cookieOptions(sessionTtlMs);
}

export function upgradeCookieOptions(): CookieOptions {
  return cookieOptions(upgradeTtlMinutes * 60 * 1000);
}
