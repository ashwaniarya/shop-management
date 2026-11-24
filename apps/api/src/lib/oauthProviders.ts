export interface OAuthProviderConfig {
  id: string;
  label: string;
  issuerUrl: string;
  scope: string;
  clientId: string;
  clientSecret: string;
}

interface OAuthProviderCatalogEntry {
  id: string;
  label: string;
  issuerUrl: string;
  scope: string;
  clientIdEnvVar: string;
  clientSecretEnvVar: string;
}

// Adding another OIDC provider (Microsoft, Apple, …) is a new entry here plus its two
// env vars — the discovery document supplies every endpoint.
const PROVIDER_CATALOG: OAuthProviderCatalogEntry[] = [
  {
    id: 'google',
    label: 'Google',
    issuerUrl: 'https://accounts.google.com',
    scope: 'openid email profile',
    clientIdEnvVar: 'GOOGLE_CLIENT_ID',
    clientSecretEnvVar: 'GOOGLE_CLIENT_SECRET',
  },
];

function readProviderConfig(entry: OAuthProviderCatalogEntry): OAuthProviderConfig | undefined {
  const clientId = process.env[entry.clientIdEnvVar]?.trim();
  const clientSecret = process.env[entry.clientSecretEnvVar]?.trim();
  if (!clientId || !clientSecret) {
    return undefined;
  }
  return {
    id: entry.id,
    label: entry.label,
    issuerUrl: entry.issuerUrl,
    scope: entry.scope,
    clientId,
    clientSecret,
  };
}

// Env is read per call rather than cached at module load so a deployment can turn a
// provider on by setting its two variables, and so tests can toggle one mid-suite.
export function listEnabledProviders(): OAuthProviderConfig[] {
  return PROVIDER_CATALOG.map(readProviderConfig).filter(
    (provider): provider is OAuthProviderConfig => provider !== undefined,
  );
}

export function findEnabledProvider(providerId: string): OAuthProviderConfig | undefined {
  const entry = PROVIDER_CATALOG.find((candidate) => candidate.id === providerId);
  return entry ? readProviderConfig(entry) : undefined;
}

export function getWebAppUrl(): string {
  return (process.env.WEB_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

// The redirect URI must match what is registered with the provider byte for byte.
// It defaults to the web origin because the Next server reverse-proxies /api/v1/* to
// this API, which keeps the whole flow on one domain.
export function buildRedirectUri(providerId: string): string {
  const base = (process.env.OAUTH_REDIRECT_BASE_URL ?? getWebAppUrl()).replace(/\/$/, '');
  return `${base}/api/v1/auth/oauth/${providerId}/callback`;
}

function readOrigin(envVarName: string, value: string): string {
  try {
    return new URL(value).origin;
  } catch {
    throw new Error(`${envVarName} is not a valid absolute URL: "${value}"`);
  }
}

// Checked at boot because both misconfigurations fail silently per request: without
// WEB_APP_URL every redirect falls back to localhost, and a callback on another origin
// never receives the transaction cookie /start set on the web origin (session_expired).
export function assertOAuthRedirectConfigured(): void {
  if (process.env.NODE_ENV !== 'production' || listEnabledProviders().length === 0) {
    return;
  }

  const webAppUrl = process.env.WEB_APP_URL;
  if (!webAppUrl?.trim()) {
    throw new Error(
      'WEB_APP_URL must be set to the public web app origin when an OAuth provider is enabled in production.',
    );
  }
  const webAppOrigin = readOrigin('WEB_APP_URL', webAppUrl);

  const redirectBaseUrl = process.env.OAUTH_REDIRECT_BASE_URL;
  if (redirectBaseUrl === undefined) {
    return;
  }
  const redirectOrigin = readOrigin('OAUTH_REDIRECT_BASE_URL', redirectBaseUrl);
  if (redirectOrigin !== webAppOrigin) {
    throw new Error(
      `OAUTH_REDIRECT_BASE_URL origin (${redirectOrigin}) must match WEB_APP_URL origin (${webAppOrigin}): ` +
        'the OAuth transaction cookie is set on the web app origin and would not reach a callback on another host.',
    );
  }
}
