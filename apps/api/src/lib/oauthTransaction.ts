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

// Carries the freshly minted session token from the callback redirect to the one POST
// that claims it. The token never appears in a URL, so a link cannot plant one.
export const OAUTH_SESSION_COOKIE = 'oauth_session';

// Only has to outlive the redirect to /auth/callback and the page's immediate POST.
const OAUTH_SESSION_TTL_SECONDS = 60;

const OAUTH_SESSION_COOKIE_PATH = '/api/v1/auth/oauth/session';

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

function buildOAuthCookieOptions(path: string, ttlSeconds: number): CookieOptions {
  return {
    httpOnly: true,
    // Lax, not Strict: the provider sends the user back via a top-level cross-site GET,
    // and Strict would withhold the transaction cookie on exactly that navigation. Lax
    // still withholds both cookies from cross-site POSTs.
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path,
    maxAge: ttlSeconds * 1000,
  };
}

export function oauthTransactionCookieOptions(): CookieOptions {
  return buildOAuthCookieOptions(OAUTH_COOKIE_PATH, OAUTH_TRANSACTION_TTL_SECONDS);
}

export function oauthSessionCookieOptions(): CookieOptions {
  return buildOAuthCookieOptions(OAUTH_SESSION_COOKIE_PATH, OAUTH_SESSION_TTL_SECONDS);
}
