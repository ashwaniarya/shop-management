import { Router, type Response } from 'express';
import rateLimit from 'express-rate-limit';

import { asyncHandler } from '../lib/asyncHandler';
import { buildRedirectUri, findEnabledProvider, getWebAppUrl, listEnabledProviders } from '../lib/oauthProviders';
import {
  OAUTH_TRANSACTION_COOKIE,
  oauthTransactionCookieOptions,
  signOAuthTransaction,
  verifyOAuthTransaction,
} from '../lib/oauthTransaction';
import { NotFoundError } from '../services/errors';
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

function clearTransactionCookie(res: Response): void {
  const { maxAge: _maxAge, ...clearOptions } = oauthTransactionCookieOptions();
  res.clearCookie(OAUTH_TRANSACTION_COOKIE, clearOptions);
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
    // Handed over in the fragment, not the query string: fragments are never sent to a
    // server, so the token stays out of access logs, proxies and the Referer header.
    res.redirect(`${getWebAppUrl()}/auth/callback#token=${encodeURIComponent(token)}`);
  } catch (error) {
    console.error('[oauth] callback failed:', error);
    failureRedirect('sign_in_failed');
  }
});
