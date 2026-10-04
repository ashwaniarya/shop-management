import type { CookieOptions } from 'express';
import jwt from 'jsonwebtoken';

export const OAUTH_TRANSACTION_COOKIE = 'oauth_tx';

// Long enough for a slow consent screen, short enough that a stolen cookie is stale.
const OAUTH_TRANSACTION_TTL_SECONDS = 600;

// This cookie is signed with the same JWT_SECRET as a session token, so it carries an
// audience that marks it as a handshake artifact. Session verification rejects anything
// bearing it, and this module rejects anything without it — neither can pass as the other.
const OAUTH_TRANSACTION_AUDIENCE = 'oauth-transaction';

// Scoped to the OAuth routes so it is never attached to ordinary API calls.
const OAUTH_COOKIE_PATH = '/api/v1/auth/oauth';

export interface OAuthTransaction {
  provider: string;
  state: string;
  nonce: string;
  codeVerifier: string;
}

// Read lazily rather than at module load: services/auth.ts already hard-fails on a
// missing JWT_SECRET at boot, and deferring keeps this module importable in isolation.
function getSigningSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return secret;
}

// The state/nonce/verifier triple has to survive the round trip to the provider. Signing
// it into a cookie keeps the API stateless — no server-side session store — while the
// signature stops a caller from choosing their own state and replaying a stolen code.
export function signOAuthTransaction(transaction: OAuthTransaction): string {
  return jwt.sign(transaction, getSigningSecret(), {
    expiresIn: OAUTH_TRANSACTION_TTL_SECONDS,
    audience: OAUTH_TRANSACTION_AUDIENCE,
  });
}

export function verifyOAuthTransaction(token: string): OAuthTransaction {
  const payload = jwt.verify(token, getSigningSecret(), {
    audience: OAUTH_TRANSACTION_AUDIENCE,
  }) as unknown as OAuthTransaction;
  if (!payload.provider || !payload.state || !payload.nonce || !payload.codeVerifier) {
    throw new Error('OAuth transaction cookie is missing required fields');
  }
  return payload;
}

export function oauthTransactionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    // Lax, not Strict: the provider sends the user back via a top-level cross-site GET,
    // and Strict would withhold the cookie on exactly that navigation.
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: OAUTH_COOKIE_PATH,
    maxAge: OAUTH_TRANSACTION_TTL_SECONDS * 1000,
  };
}
