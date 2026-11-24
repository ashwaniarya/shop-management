// Behavioural test: the account resolution rules that decide whether a social sign-in
// joins an existing account or opens a new shop. Runs against the real DB; the provider
// handshake itself is not exercised here, only the profile it yields.
import type { AuthUser } from '@shop/shared';
import { UserRole } from '@prisma/client';
import { afterAll, describe, expect, it } from 'vitest';

import { prisma } from '../lib/prisma';
import { verifyToken } from './auth';
import { signInWithOAuthProfile, type OAuthProfile } from './oauth';

const PROVIDER = 'google';

describe('signInWithOAuthProfile', () => {
  const ts = Date.now();
  const createdUserIds: number[] = [];
  const createdShopIds: number[] = [];

  function profileFor(suffix: string, overrides: Partial<OAuthProfile> = {}): OAuthProfile {
    return {
      providerUserId: `google-sub-${suffix}-${ts}`,
      email: `oauth-${suffix}-${ts}@example.com`,
      emailVerified: true,
      name: 'Aftab Khan',
      ...overrides,
    };
  }

  // Generic pass-through so callers keep the full { token, user } type.
  async function trackSignIn<T extends { user: AuthUser }>(result: T): Promise<T> {
    createdUserIds.push(result.user.id);
    createdShopIds.push(result.user.shopId);
    return result;
  }

  afterAll(async () => {
    await prisma.userIdentity.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    await prisma.shop.deleteMany({ where: { id: { in: createdShopIds } } });
  });

  it('opens a new shop with an OWNER for an identity that has never signed in', async () => {
    const result = await trackSignIn(await signInWithOAuthProfile(PROVIDER, profileFor('fresh')));

    expect(result.user.role).toBe(UserRole.OWNER);
    expect(result.user.name).toBe('Aftab Khan');

    const shop = await prisma.shop.findUnique({ where: { id: result.user.shopId } });
    expect(shop?.name).toBe("Aftab Khan's Shop");

    const claims = verifyToken(result.token);
    expect(claims.sub).toBe(result.user.id);
    expect(claims.shopId).toBe(result.user.shopId);
  });

  it('records the external identity so the same account is reused on the next sign-in', async () => {
    const profile = profileFor('returning');

    const first = await trackSignIn(await signInWithOAuthProfile(PROVIDER, profile));
    const second = await signInWithOAuthProfile(PROVIDER, profile);

    expect(second.user.id).toBe(first.user.id);
    expect(second.user.shopId).toBe(first.user.shopId);

    const identities = await prisma.userIdentity.findMany({ where: { userId: first.user.id } });
    expect(identities).toHaveLength(1);
    expect(identities[0].providerUserId).toBe(profile.providerUserId);
  });

  // Links a second provider to an account whose address a previous provider-verified
  // sign-in already established.
  it('links to an existing account when the provider says the email is verified', async () => {
    const email = `oauth-link-${ts}@example.com`;
    const shop = await prisma.shop.create({ data: { name: `OAuth Link Shop ${ts}` } });
    createdShopIds.push(shop.id);
    const existingUser = await prisma.user.create({
      data: { shopId: shop.id, name: 'Existing Owner', email, verifiedEmail: email, role: UserRole.OWNER },
    });
    createdUserIds.push(existingUser.id);

    const result = await signInWithOAuthProfile(PROVIDER, profileFor('link', { email, emailVerified: true }));

    expect(result.user.id).toBe(existingUser.id);
    expect(result.user.shopId).toBe(shop.id);
    expect(await prisma.userIdentity.count({ where: { userId: existingUser.id } })).toBe(1);
  });

  // Account-takeover regression. `app_user.email` is OWNER-writable via
  // POST/PATCH /shops/:shopId/users, so anyone can self-register a shop and plant a
  // stranger's address on a user in it. If linking matched that column, the victim's
  // first Google sign-in would drop them inside the attacker's shop.
  it('does NOT link to an account whose email was merely planted by a shop owner', async () => {
    const victimEmail = `oauth-victim-${ts}@example.com`;
    const attackerShop = await prisma.shop.create({ data: { name: `Attacker Shop ${ts}` } });
    createdShopIds.push(attackerShop.id);
    const plantedUser = await prisma.user.create({
      data: { shopId: attackerShop.id, name: 'Planted', email: victimEmail, role: UserRole.STAFF },
    });
    createdUserIds.push(plantedUser.id);

    const result = await trackSignIn(
      await signInWithOAuthProfile(PROVIDER, profileFor('victim', { email: victimEmail, emailVerified: true })),
    );

    expect(result.user.id).not.toBe(plantedUser.id);
    expect(result.user.shopId).not.toBe(attackerShop.id);
    expect(result.user.role).toBe(UserRole.OWNER);
  });

  it('matches a verified address case-insensitively so one mailbox cannot become two accounts', async () => {
    const email = `oauth-case-${ts}@example.com`;
    const first = await trackSignIn(await signInWithOAuthProfile(PROVIDER, profileFor('case', { email })));

    const second = await signInWithOAuthProfile(
      'microsoft',
      profileFor('case-upper', { email: email.toUpperCase(), emailVerified: true }),
    );

    expect(second.user.id).toBe(first.user.id);
  });

  // Guards the classic account-takeover route: a provider that hands back an
  // unverified address must never be trusted to prove ownership of that address.
  it('refuses to link on an unverified email and opens a separate shop instead', async () => {
    const email = `oauth-unverified-${ts}@example.com`;
    const shop = await prisma.shop.create({ data: { name: `OAuth Unverified Shop ${ts}` } });
    createdShopIds.push(shop.id);
    const victimUser = await prisma.user.create({
      data: { shopId: shop.id, name: 'Victim Owner', email, verifiedEmail: email, role: UserRole.OWNER },
    });
    createdUserIds.push(victimUser.id);

    const result = await trackSignIn(
      await signInWithOAuthProfile(PROVIDER, profileFor('unverified', { email, emailVerified: false })),
    );

    expect(result.user.id).not.toBe(victimUser.id);
    expect(result.user.shopId).not.toBe(shop.id);
  });

  it('never promotes an unverified email to the linkable column, so it cannot be squatted', async () => {
    const email = `oauth-squat-${ts}@example.com`;

    const result = await trackSignIn(
      await signInWithOAuthProfile(PROVIDER, profileFor('squat', { email, emailVerified: false })),
    );

    const user = await prisma.user.findUnique({ where: { id: result.user.id } });
    expect(user?.verifiedEmail).toBeNull();
    // Kept as a plain contact detail, which nothing authenticates against.
    expect(user?.email).toBe(email);
  });

  it('rejects a sign-in for a deactivated account', async () => {
    const profile = profileFor('deactivated');
    const first = await trackSignIn(await signInWithOAuthProfile(PROVIDER, profile));
    await prisma.user.update({ where: { id: first.user.id }, data: { isActive: false } });

    await expect(signInWithOAuthProfile(PROVIDER, profile)).rejects.toThrow(/deactivated/i);
  });

  // Recycled-address takeover regression. Providers re-issue a deleted account's address
  // to a new person under a new subject id; matching on the address alone would hand
  // that newcomer the previous owner's shop.
  it('does NOT link a verified address whose account already has a different subject for this provider', async () => {
    const email = `oauth-recycled-${ts}@example.com`;
    const originalSubject = `google-sub-recycled-original-${ts}`;
    const shop = await prisma.shop.create({ data: { name: `OAuth Recycled Shop ${ts}` } });
    createdShopIds.push(shop.id);
    const originalOwner = await prisma.user.create({
      data: {
        shopId: shop.id,
        name: 'Original Owner',
        email,
        verifiedEmail: email,
        role: UserRole.OWNER,
        identities: { create: { provider: PROVIDER, providerUserId: originalSubject, email } },
      },
    });
    createdUserIds.push(originalOwner.id);

    const result = await trackSignIn(
      await signInWithOAuthProfile(PROVIDER, profileFor('recycled-newcomer', { email, emailVerified: true })),
    );

    expect(result.user.id).not.toBe(originalOwner.id);
    expect(result.user.shopId).not.toBe(shop.id);
    const newcomer = await prisma.user.findUnique({ where: { id: result.user.id } });
    expect(newcomer?.verifiedEmail).toBeNull();
    const originalGoogleIdentities = await prisma.userIdentity.findMany({
      where: { userId: originalOwner.id, provider: PROVIDER },
    });
    expect(originalGoogleIdentities.map((identity) => identity.providerUserId)).toEqual([originalSubject]);
  });

  it('rejects linking to a deactivated account without recording the identity', async () => {
    const email = `oauth-inactive-link-${ts}@example.com`;
    const shop = await prisma.shop.create({ data: { name: `OAuth Inactive Link Shop ${ts}` } });
    createdShopIds.push(shop.id);
    const deactivatedUser = await prisma.user.create({
      data: { shopId: shop.id, name: 'Deactivated Owner', email, verifiedEmail: email, role: UserRole.OWNER, isActive: false },
    });
    createdUserIds.push(deactivatedUser.id);
    const profile = profileFor('inactive-link', { email, emailVerified: true });

    await expect(signInWithOAuthProfile(PROVIDER, profile)).rejects.toThrow(/deactivated/i);

    expect(
      await prisma.userIdentity.count({ where: { provider: PROVIDER, providerUserId: profile.providerUserId } }),
    ).toBe(0);
  });

  it('links a verified address across providers when the account has no identity for this one', async () => {
    const email = `oauth-cross-provider-${ts}@example.com`;
    const shop = await prisma.shop.create({ data: { name: `OAuth Cross Provider Shop ${ts}` } });
    createdShopIds.push(shop.id);
    const existingUser = await prisma.user.create({
      data: {
        shopId: shop.id,
        name: 'Cross Provider Owner',
        email,
        verifiedEmail: email,
        role: UserRole.OWNER,
        identities: { create: { provider: 'microsoft', providerUserId: `microsoft-sub-cross-${ts}`, email } },
      },
    });
    createdUserIds.push(existingUser.id);
    const profile = profileFor('cross-provider', { email, emailVerified: true });

    const result = await signInWithOAuthProfile(PROVIDER, profile);

    expect(result.user.id).toBe(existingUser.id);
    const googleIdentities = await prisma.userIdentity.findMany({ where: { userId: existingUser.id, provider: PROVIDER } });
    expect(googleIdentities.map((identity) => identity.providerUserId)).toEqual([profile.providerUserId]);
  });

  it('lands both racing first sign-ins of one identity on the linked account', async () => {
    const email = `oauth-link-race-${ts}@example.com`;
    const shop = await prisma.shop.create({ data: { name: `OAuth Link Race Shop ${ts}` } });
    createdShopIds.push(shop.id);
    const existingUser = await prisma.user.create({
      data: { shopId: shop.id, name: 'Race Owner', email, verifiedEmail: email, role: UserRole.OWNER },
    });
    createdUserIds.push(existingUser.id);
    const profile = profileFor('link-race', { email, emailVerified: true });

    const results = await Promise.all([
      signInWithOAuthProfile(PROVIDER, profile),
      signInWithOAuthProfile(PROVIDER, profile),
    ]);

    expect(results.map((result) => result.user.id)).toEqual([existingUser.id, existingUser.id]);
    expect(await prisma.userIdentity.count({ where: { userId: existingUser.id } })).toBe(1);
  });

  it('falls back to the email local-part when the provider sends no name', async () => {
    const result = await trackSignIn(
      await signInWithOAuthProfile(PROVIDER, profileFor('noname', { name: null })),
    );

    expect(result.user.name).toBe(`oauth-noname-${ts}`);
  });
});
