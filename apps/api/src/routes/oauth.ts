import { Router, type CookieOptions, type Response } from 'express';
import rateLimit from 'express-rate-limit';

import { asyncHandler } from '../lib/asyncHandler';
import { buildRedirectUri, findEnabledProvider, getWebAppUrl, listEnabledProviders } from '../lib/oauthProviders';
import {
  OAUTH_SESSION_COOKIE,
  OAUTH_TRANSACTION_COOKIE,
  oauthSessionCookieOptions,
  oauthTransactionCookieOptions,
  signOAuthTransaction,
  verifyOAuthTransaction,
} from '../lib/oauthTransaction';
import { verifyToken } from '../services/auth';
import { NotFoundError, UnauthorizedError } from '../services/errors';
import { buildAuthorizationRequest, fetchProfileFromCallback, signInWithOAuthProfile } from '../services/oauth';

const startLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: { code: 'RATE_LIMITED', message: 'Too many sign-in attempts. Please try again later.' } },
});

export const oauthRouter = Router();

oauthRouter.get('/auth/oauth/providers', (_req, res) => {
  res.json({ data: listEnabledProviders().map((provider) => ({ id: provider.id, label: provider.label })) });
});

oauthRouter.get(
  '/auth/oauth/:provider/start',
  startLimiter,
  asyncHandler(async (req, res) => {
    const provider = findEnabledProvider(req.params.provider);
    if (!provider) {
      throw new NotFoundError(`Sign-in provider "${req.params.provider}" is not enabled`);
    }

    const redirectUri = buildRedirectUri(provider.id);
    const { authorizationUrl, state, nonce, codeVerifier } = await buildAuthorizationRequest(provider, redirectUri);

    res.cookie(
      OAUTH_TRANSACTION_COOKIE,
      signOAuthTransaction({ provider: provider.id, state, nonce, codeVerifier }),
      oauthTransactionCookieOptions(),
    );
    res.redirect(authorizationUrl);
  }),
);

// Express 4's clearCookie derives expiry from maxAge when given one, which would
// re-set the cookie instead of expiring it, so the clear goes out without it.
function clearOAuthCookie(res: Response, cookieName: string, cookieOptions: CookieOptions): void {
  const { maxAge: _maxAge, ...clearOptions } = cookieOptions;
  res.clearCookie(cookieName, clearOptions);
}

function clearTransactionCookie(res: Response): void {
  clearOAuthCookie(res, OAUTH_TRANSACTION_COOKIE, oauthTransactionCookieOptions());
}

// The caller here is a browser mid-redirect, not an API client, so every failure ends as
// a redirect to the login screen with a code it can render — never a JSON error body.
oauthRouter.get('/auth/oauth/:provider/callback', async (req, res) => {
  const loginUrl = `${getWebAppUrl()}/login`;
  const failureRedirect = (reason: string) => {
    clearTransactionCookie(res);
    res.redirect(`${loginUrl}?error=${reason}`);
  };

  try {
    if (typeof req.query.error === 'string') {
      failureRedirect(req.query.error === 'access_denied' ? 'access_denied' : 'sign_in_failed');
      return;
    }

    const provider = findEnabledProvider(req.params.provider);
    if (!provider) {
      failureRedirect('provider_unavailable');
      return;
    }

    const transactionCookie = req.cookies?.[OAUTH_TRANSACTION_COOKIE];
    if (typeof transactionCookie !== 'string') {
      failureRedirect('session_expired');
      return;
    }

    const transaction = verifyOAuthTransaction(transactionCookie);
    if (transaction.provider !== provider.id) {
      failureRedirect('session_expired');
      return;
    }

    const callbackQuery: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') {
        callbackQuery[key] = value;
      }
    }

    const profile = await fetchProfileFromCallback(provider, buildRedirectUri(provider.id), callbackQuery, {
      state: transaction.state,
      nonce: transaction.nonce,
      codeVerifier: transaction.codeVerifier,
    });
    const { token } = await signInWithOAuthProfile(provider.id, profile);

    clearTransactionCookie(res);
    // Never in the URL: a page that adopted a token from its own address could be fed an
    // attacker's session by a crafted link. The cookie is only ever set by this response.
    res.cookie(OAUTH_SESSION_COOKIE, token, oauthSessionCookieOptions());
    res.redirect(`${getWebAppUrl()}/auth/callback`);
  } catch (error) {
    console.error('[oauth] callback failed:', error);
    failureRedirect('sign_in_failed');
  }
});

// Safe from cross-site use without a CSRF token: SameSite=Lax keeps the cookie off a
// cross-site POST, and CORS never allows credentials, so no other origin can read the
// token from a response.
oauthRouter.post(
  '/auth/oauth/session',
  asyncHandler(async (req, res) => {
    const sessionCookie = req.cookies?.[OAUTH_SESSION_COOKIE];
    clearOAuthCookie(res, OAUTH_SESSION_COOKIE, oauthSessionCookieOptions());

    if (typeof sessionCookie !== 'string') {
      throw new UnauthorizedError('No sign-in is waiting to be completed');
    }
    try {
      verifyToken(sessionCookie);
    } catch {
      throw new UnauthorizedError('Sign-in handoff is invalid or expired');
    }

    res.json({ token: sessionCookie });
  }),
);
