// Behavioural test: the public OAuth endpoints. Only the code exchange with the identity
// provider is stubbed; account resolution and the session handoff run against the real
// database.
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { app } from '../app';
import { prisma } from '../lib/prisma';
import { getWebAppUrl } from '../lib/oauthProviders';
import { signOAuthTransaction } from '../lib/oauthTransaction';
import { verifyToken } from '../services/auth';
import { fetchProfileFromCallback } from '../services/oauth';

vi.mock('../services/oauth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/oauth')>()),
  fetchProfileFromCallback: vi.fn(),
}));

const SESSION_COOKIE_PATH = '/api/v1/auth/oauth/session';

function findSetCookie(response: request.Response, cookieName: string): string | undefined {
  const setCookieHeader = response.headers['set-cookie'] as unknown as string[] | undefined;
  return setCookieHeader?.find((cookie) => cookie.startsWith(`${cookieName}=`));
}

function readCookieValue(setCookie: string): string {
  return setCookie.slice(setCookie.indexOf('=') + 1, setCookie.indexOf(';'));
}

function googleTransactionCookie(): string {
  return `oauth_tx=${signOAuthTransaction({ provider: 'google', state: 'xyz', nonce: 'nonce', codeVerifier: 'verifier' })}`;
}

function enableGoogle(): void {
  process.env.GOOGLE_CLIENT_ID = 'test-client-id';
  process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
}

function disableGoogle(): void {
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_SECRET;
}

describe('oauth router', () => {
  afterEach(() => {
    disableGoogle();
  });

  describe('GET /auth/oauth/providers', () => {
    it('is reachable without a token', async () => {
      const response = await request(app).get('/api/v1/auth/oauth/providers');

      expect(response.status).toBe(200);
    });

    it('lists no providers when no credentials are configured', async () => {
      disableGoogle();

      const response = await request(app).get('/api/v1/auth/oauth/providers');

      expect(response.body).toEqual({ data: [] });
    });

    it('lists google once both of its credentials are set', async () => {
      enableGoogle();

      const response = await request(app).get('/api/v1/auth/oauth/providers');

      expect(response.body).toEqual({ data: [{ id: 'google', label: 'Google' }] });
    });

    it('keeps a provider hidden when only its client id is set', async () => {
      process.env.GOOGLE_CLIENT_ID = 'test-client-id';

      const response = await request(app).get('/api/v1/auth/oauth/providers');

      expect(response.body).toEqual({ data: [] });
    });
  });

  describe('GET /auth/oauth/:provider/start', () => {
    it('returns 404 for a provider that is not configured', async () => {
      const response = await request(app).get('/api/v1/auth/oauth/google/start');

      expect(response.status).toBe(404);
    });

    it('returns 404 for a provider that does not exist at all', async () => {
      const response = await request(app).get('/api/v1/auth/oauth/myspace/start');

      expect(response.status).toBe(404);
    });
  });

  describe('GET /auth/oauth/:provider/callback', () => {
    it('redirects to login when the user declined consent at the provider', async () => {
      enableGoogle();

      const response = await request(app).get('/api/v1/auth/oauth/google/callback?error=access_denied');

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('/login?error=access_denied');
    });

    it('redirects to login when the transaction cookie is absent', async () => {
      enableGoogle();

      const response = await request(app).get('/api/v1/auth/oauth/google/callback?code=abc&state=xyz');

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('/login?error=session_expired');
    });

    // A forged or tampered cookie must not be accepted: it carries the state and PKCE
    // verifier the whole handshake is anchored on.
    it('redirects to login when the transaction cookie is not a valid signed token', async () => {
      enableGoogle();

      const response = await request(app)
        .get('/api/v1/auth/oauth/google/callback?code=abc&state=xyz')
        .set('Cookie', 'oauth_tx=not-a-signed-transaction');

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('/login?error=sign_in_failed');
    });

    it('redirects to login when the provider is not configured', async () => {
      const response = await request(app).get('/api/v1/auth/oauth/google/callback?code=abc&state=xyz');

      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('/login?error=provider_unavailable');
    });

    it('never answers a browser redirect with a JSON error body', async () => {
      enableGoogle();

      const response = await request(app).get('/api/v1/auth/oauth/google/callback?code=abc&state=xyz');

      expect(response.body).toEqual({});
    });
  });

  describe('sign-in handoff', () => {
    const providerUserId = `oauth-route-${Date.now()}`;
    let callbackResponse: request.Response;

    beforeAll(async () => {
      enableGoogle();
      vi.mocked(fetchProfileFromCallback).mockResolvedValue({
        providerUserId,
        email: `${providerUserId}@example.com`,
        emailVerified: true,
        name: 'Handoff Tester',
      });

      callbackResponse = await request(app)
        .get('/api/v1/auth/oauth/google/callback?code=abc&state=xyz')
        .set('Cookie', googleTransactionCookie());
    });

    afterAll(async () => {
      const identities = await prisma.userIdentity.findMany({
        where: { provider: 'google', providerUserId },
        include: { user: { select: { shopId: true } } },
      });
      await prisma.userIdentity.deleteMany({ where: { provider: 'google', providerUserId } });
      await prisma.user.deleteMany({ where: { id: { in: identities.map((identity) => identity.userId) } } });
      await prisma.shop.deleteMany({ where: { id: { in: identities.map((identity) => identity.user.shopId) } } });
    });

    function handoffCookieFromCallback(): string {
      const setCookie = findSetCookie(callbackResponse, 'oauth_session');
      if (!setCookie) {
        throw new Error('callback did not set the handoff cookie');
      }
      return `oauth_session=${readCookieValue(setCookie)}`;
    }

    describe('GET /auth/oauth/:provider/callback on success', () => {
      // A token in the URL is what let a crafted link sign a victim in to the
      // attacker's account; the redirect must carry nothing the page could adopt.
      it('redirects to the web callback page with no token in the URL', () => {
        expect(callbackResponse.status).toBe(302);
        expect(callbackResponse.headers.location).toBe(`${getWebAppUrl()}/auth/callback`);
        expect(callbackResponse.headers.location).not.toContain('token');
      });

      it('parks the session in a short-lived HttpOnly cookie scoped to the exchange route', () => {
        const setCookie = findSetCookie(callbackResponse, 'oauth_session');

        expect(setCookie).toBeDefined();
        expect(setCookie).toContain('HttpOnly');
        expect(setCookie).toContain('SameSite=Lax');
        expect(setCookie).toContain(`Path=${SESSION_COOKIE_PATH}`);
        expect(setCookie).toContain('Max-Age=60');
        expect(() => verifyToken(readCookieValue(setCookie!))).not.toThrow();
      });

      it('clears the transaction cookie', () => {
        expect(findSetCookie(callbackResponse, 'oauth_tx')).toMatch(/^oauth_tx=;.*Expires=Thu, 01 Jan 1970/);
      });
    });

    describe('POST /auth/oauth/session', () => {
      it('returns 401 when no handoff cookie is present', async () => {
        const response = await request(app).post(SESSION_COOKIE_PATH);

        expect(response.status).toBe(401);
        expect(response.body.error.code).toBe('UNAUTHORIZED');
      });

      // The transaction cookie is signed with the same secret as a session token; it
      // must never be exchangeable for one.
      it('returns 401 when the cookie holds a transaction token instead of a session', async () => {
        const transactionToken = googleTransactionCookie().slice('oauth_tx='.length);

        const response = await request(app)
          .post(SESSION_COOKIE_PATH)
          .set('Cookie', `oauth_session=${transactionToken}`);

        expect(response.status).toBe(401);
        expect(response.body).not.toHaveProperty('token');
      });

      it('returns 401 for a tampered cookie and still clears it', async () => {
        const response = await request(app).post(SESSION_COOKIE_PATH).set('Cookie', 'oauth_session=not-a-jwt');

        expect(response.status).toBe(401);
        expect(findSetCookie(response, 'oauth_session')).toMatch(/^oauth_session=;.*Expires=Thu, 01 Jan 1970/);
      });

      it('hands back the session token from the callback and clears the cookie', async () => {
        const handoffCookie = handoffCookieFromCallback();

        const response = await request(app).post(SESSION_COOKIE_PATH).set('Cookie', handoffCookie);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ token: handoffCookie.slice('oauth_session='.length) });
        const signedInIdentity = await prisma.userIdentity.findUniqueOrThrow({
          where: { provider_providerUserId: { provider: 'google', providerUserId } },
        });
        expect(verifyToken(response.body.token).sub).toBe(signedInIdentity.userId);

        const clearingCookie = findSetCookie(response, 'oauth_session');
        expect(clearingCookie).toMatch(/^oauth_session=;.*Expires=Thu, 01 Jan 1970/);
        expect(clearingCookie).toContain(`Path=${SESSION_COOKIE_PATH}`);
        expect(clearingCookie).toContain('HttpOnly');
      });

      it('does not hand out the token on a GET', async () => {
        const response = await request(app).get(SESSION_COOKIE_PATH).set('Cookie', handoffCookieFromCallback());

        expect(response.status).not.toBe(200);
        expect(response.body).not.toHaveProperty('token');
      });
    });
  });
});
