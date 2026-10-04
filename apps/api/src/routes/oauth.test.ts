// Behavioural test: the public OAuth endpoints. The provider handshake needs a real
// identity provider, so these cover discovery of enabled providers and every path that
// must fail closed without one.
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';

import { app } from '../app';

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
});
