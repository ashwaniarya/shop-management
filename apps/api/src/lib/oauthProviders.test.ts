// Unit test: pure logic, boot-time OAuth redirect config guard
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { assertOAuthRedirectConfigured } from './oauthProviders';

function enableGoogle(): void {
  vi.stubEnv('GOOGLE_CLIENT_ID', 'test-client-id');
  vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-client-secret');
}

describe('assertOAuthRedirectConfigured', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('GOOGLE_CLIENT_ID', undefined);
    vi.stubEnv('GOOGLE_CLIENT_SECRET', undefined);
    vi.stubEnv('WEB_APP_URL', undefined);
    vi.stubEnv('OAUTH_REDIRECT_BASE_URL', undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('throws in production when a provider is enabled and WEB_APP_URL is unset', () => {
    enableGoogle();

    expect(() => assertOAuthRedirectConfigured()).toThrow(/WEB_APP_URL must be set/);
  });

  it('throws in production when a provider is enabled and WEB_APP_URL is blank', () => {
    enableGoogle();
    vi.stubEnv('WEB_APP_URL', '   ');

    expect(() => assertOAuthRedirectConfigured()).toThrow(/WEB_APP_URL must be set/);
  });

  it('throws when OAUTH_REDIRECT_BASE_URL is on a different origin than WEB_APP_URL', () => {
    enableGoogle();
    vi.stubEnv('WEB_APP_URL', 'https://web.example.com');
    vi.stubEnv('OAUTH_REDIRECT_BASE_URL', 'https://api.example.com');

    expect(() => assertOAuthRedirectConfigured()).toThrow(
      /OAUTH_REDIRECT_BASE_URL origin \(https:\/\/api\.example\.com\) must match WEB_APP_URL origin \(https:\/\/web\.example\.com\)/,
    );
  });

  it('throws a named error when WEB_APP_URL is not an absolute URL', () => {
    enableGoogle();
    vi.stubEnv('WEB_APP_URL', 'web.example.com');

    expect(() => assertOAuthRedirectConfigured()).toThrow(/WEB_APP_URL is not a valid absolute URL/);
  });

  it('passes when OAUTH_REDIRECT_BASE_URL shares the WEB_APP_URL origin', () => {
    enableGoogle();
    vi.stubEnv('WEB_APP_URL', 'https://web.example.com');
    vi.stubEnv('OAUTH_REDIRECT_BASE_URL', 'https://web.example.com/');

    expect(() => assertOAuthRedirectConfigured()).not.toThrow();
  });

  it('passes in production when a provider is enabled and WEB_APP_URL is set', () => {
    enableGoogle();
    vi.stubEnv('WEB_APP_URL', 'https://web.example.com');

    expect(() => assertOAuthRedirectConfigured()).not.toThrow();
  });

  it('is a no-op in production when no provider is enabled', () => {
    expect(() => assertOAuthRedirectConfigured()).not.toThrow();
  });

  it('is a no-op outside production even when misconfigured', () => {
    vi.stubEnv('NODE_ENV', 'development');
    enableGoogle();
    vi.stubEnv('OAUTH_REDIRECT_BASE_URL', 'https://api.example.com');

    expect(() => assertOAuthRedirectConfigured()).not.toThrow();
  });
});
