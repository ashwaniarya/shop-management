import type { AuthUser } from '@shop/shared';
import { Prisma, UserRole } from '@prisma/client';
// resolution-mode pins this type-only import to the package's ESM types, which a
// CommonJS module cannot otherwise reference.
import type * as OpenIdClient from 'openid-client' with { 'resolution-mode': 'import' };

import { prisma } from '../lib/prisma';
import type { OAuthProviderConfig } from '../lib/oauthProviders';
import { UnauthorizedError } from './errors';
import { signToken } from './auth';

// openid-client v6 is ESM-only while this API compiles to CommonJS, so it has to be
// pulled in with a dynamic import. TypeScript's node16 mode preserves the import()
// instead of downlevelling it to require(), which would fail at runtime.
let openIdClientModulePromise: Promise<typeof OpenIdClient> | undefined;

function loadOpenIdClient(): Promise<typeof OpenIdClient> {
  openIdClientModulePromise ??= import('openid-client');
  return openIdClientModulePromise;
}

// Discovery is a network round trip, so each provider's document is fetched once per
// process. The promise (not the result) is cached so concurrent sign-ins share one fetch.
const providerConfigurationCache = new Map<string, Promise<OpenIdClient.Configuration>>();

function getProviderConfiguration(provider: OAuthProviderConfig): Promise<OpenIdClient.Configuration> {
  const cached = providerConfigurationCache.get(provider.id);
  if (cached) {
    return cached;
  }

  const configuration = loadOpenIdClient()
    .then((openIdClient) =>
      openIdClient.discovery(new URL(provider.issuerUrl), provider.clientId, provider.clientSecret),
    )
    .catch((error) => {
      // Don't poison the cache — a transient discovery failure must not disable the
      // provider for the rest of the process's life.
      providerConfigurationCache.delete(provider.id);
      throw error;
    });

  providerConfigurationCache.set(provider.id, configuration);
  return configuration;
}

export interface OAuthAuthorizationRequest {
  authorizationUrl: string;
  state: string;
  nonce: string;
  codeVerifier: string;
}

export async function buildAuthorizationRequest(
  provider: OAuthProviderConfig,
  redirectUri: string,
): Promise<OAuthAuthorizationRequest> {
  const openIdClient = await loadOpenIdClient();
  const configuration = await getProviderConfiguration(provider);

  const state = openIdClient.randomState();
  const nonce = openIdClient.randomNonce();
  const codeVerifier = openIdClient.randomPKCECodeVerifier();
  const codeChallenge = await openIdClient.calculatePKCECodeChallenge(codeVerifier);

  const authorizationUrl = openIdClient.buildAuthorizationUrl(configuration, {
    redirect_uri: redirectUri,
    scope: provider.scope,
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return { authorizationUrl: authorizationUrl.href, state, nonce, codeVerifier };
}

export interface OAuthProfile {
  providerUserId: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
}

export interface OAuthCallbackExpectations {
  state: string;
  nonce: string;
  codeVerifier: string;
}

function readStringClaim(claims: Record<string, unknown>, key: string): string | null {
  const value = claims[key];
  return typeof value === 'string' && value !== '' ? value : null;
}

export async function fetchProfileFromCallback(
  provider: OAuthProviderConfig,
  redirectUri: string,
  callbackQuery: Record<string, string>,
  expectations: OAuthCallbackExpectations,
): Promise<OAuthProfile> {
  const openIdClient = await loadOpenIdClient();
  const configuration = await getProviderConfiguration(provider);

  // Rebuilt from the registered redirect URI rather than the inbound request URL: the
  // Next server proxies /api/v1/* to this API, so req.host is the internal service, not
  // the origin the provider was given. The token request must echo the exact same value.
  const callbackUrl = new URL(redirectUri);
  for (const [key, value] of Object.entries(callbackQuery)) {
    callbackUrl.searchParams.set(key, value);
  }

  const tokens = await openIdClient.authorizationCodeGrant(configuration, callbackUrl, {
    pkceCodeVerifier: expectations.codeVerifier,
    expectedState: expectations.state,
    expectedNonce: expectations.nonce,
  });

  const claims = tokens.claims();
  if (!claims?.sub) {
    throw new UnauthorizedError('Identity provider returned no subject claim');
  }

  const claimsRecord = claims as unknown as Record<string, unknown>;
  return {
    providerUserId: claims.sub,
    email: readStringClaim(claimsRecord, 'email'),
    emailVerified: claimsRecord.email_verified === true,
    name: readStringClaim(claimsRecord, 'name'),
  };
}

function toAuthUser(user: { id: number; shopId: number; name: string; role: UserRole }): AuthUser {
  return { id: user.id, shopId: user.shopId, name: user.name, role: user.role };
}

function signInAs(user: { id: number; shopId: number; name: string; role: UserRole; isActive: boolean }): {
  token: string;
  user: AuthUser;
} {
  if (!user.isActive) {
    throw new UnauthorizedError('This account has been deactivated');
  }
  const authUser = toAuthUser(user);
  return { token: signToken(authUser), user: authUser };
}

function deriveShopName(profile: OAuthProfile): string {
  const ownerName = profile.name?.trim();
  return ownerName ? `${ownerName}'s Shop` : 'My Shop';
}

function deriveOwnerName(profile: OAuthProfile): string {
  return profile.name?.trim() || profile.email?.split('@')[0] || 'Shop Owner';
}

// Addresses differing only by case are the same mailbox, so they must not produce two
// accounts — or slip past the unique index that keeps one identity per account.
function normalizeEmail(email: string | null): string | null {
  const normalized = email?.trim().toLowerCase();
  return normalized ? normalized : null;
}

async function createShopWithOAuthOwner(providerId: string, profile: OAuthProfile, verifiedEmail: string | null) {
  return prisma.$transaction(async (tx) => {
    const shop = await tx.shop.create({ data: { name: deriveShopName(profile) } });
    return tx.user.create({
      data: {
        shopId: shop.id,
        name: deriveOwnerName(profile),
        email: profile.email,
        // Only ever set from a provider-verified claim, which is what makes this column
        // trustworthy enough to match a future sign-in against.
        verifiedEmail,
        role: UserRole.OWNER,
        identities: {
          create: { provider: providerId, providerUserId: profile.providerUserId, email: profile.email },
        },
      },
    });
  });
}

async function findUserByIdentity(providerId: string, providerUserId: string) {
  const identity = await prisma.userIdentity.findUnique({
    where: { provider_providerUserId: { provider: providerId, providerUserId } },
    include: { user: true },
  });
  return identity?.user;
}

// Resolves an external identity to an app session, creating or linking an account as
// needed, and returns the same { token, user } shape as password login so every caller
// downstream (RBAC, /auth/me) is unchanged.
export async function signInWithOAuthProfile(
  providerId: string,
  profile: OAuthProfile,
): Promise<{ token: string; user: AuthUser }> {
  const linkedUser = await findUserByIdentity(providerId, profile.providerUserId);
  if (linkedUser) {
    return signInAs(linkedUser);
  }

  // Both sides of this match must be trustworthy. The provider side is the
  // `email_verified` claim; the app side is `verifiedEmail`, a column only this flow
  // writes. Matching on `user.email` instead would be an account-takeover hole: that
  // column is OWNER-writable through the shop-users endpoints, so anyone could create a
  // shop, plant a stranger's address on a user in it, and capture that person's first
  // social sign-in into their shop.
  const verifiedEmail = profile.emailVerified ? normalizeEmail(profile.email) : null;
  if (verifiedEmail) {
    const userWithSameEmail = await prisma.user.findUnique({ where: { verifiedEmail } });
    if (userWithSameEmail) {
      await prisma.userIdentity.create({
        data: { userId: userWithSameEmail.id, provider: providerId, providerUserId: profile.providerUserId, email: profile.email },
      });
      return signInAs(userWithSameEmail);
    }
  }

  try {
    return signInAs(await createShopWithOAuthOwner(providerId, profile, verifiedEmail));
  } catch (error) {
    // Two first-time sign-ins racing on the same identity: the unique index rejects the
    // loser, whose account already exists by now, so re-read it instead of failing.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const racedUser = await findUserByIdentity(providerId, profile.providerUserId);
      if (racedUser) {
        return signInAs(racedUser);
      }
    }
    throw error;
  }
}
