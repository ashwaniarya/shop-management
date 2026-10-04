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
