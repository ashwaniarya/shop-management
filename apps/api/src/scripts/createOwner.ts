import { UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

import { prisma } from '../lib/prisma';

// Idempotent first-owner bootstrap for a fresh deployment. Auth is mandatory and
// login needs a bcrypt passwordHash that no migration creates, so a migrated-but-
// unseeded database has zero login-capable users. This provisions exactly one shop
// and one OWNER from environment variables. It is safe to re-run: it no-ops the
// moment any user exists, and it never deletes data (unlike the dev seed).

const SALT_ROUNDS = 10;
const PIN_PATTERN = /^\d{4,6}$/;

async function bootstrapOwner(): Promise<void> {
  const username = process.env.BOOTSTRAP_OWNER_USERNAME?.trim();
  const pin = process.env.BOOTSTRAP_OWNER_PIN?.trim();
  const ownerName = process.env.BOOTSTRAP_OWNER_NAME?.trim() || 'Shop Owner';
  const shopName = process.env.BOOTSTRAP_SHOP_NAME?.trim() || 'My Shop';

  if (!username || !pin) {
    throw new Error('BOOTSTRAP_OWNER_USERNAME and BOOTSTRAP_OWNER_PIN must both be set');
  }
  if (!PIN_PATTERN.test(pin)) {
    throw new Error('BOOTSTRAP_OWNER_PIN must be 4 to 6 digits');
  }

  const existingUserCount = await prisma.user.count();
  if (existingUserCount > 0) {
    console.log(`[bootstrap-owner] ${existingUserCount} user(s) already exist — nothing to do.`);
    return;
  }

  const passwordHash = await bcrypt.hash(pin, SALT_ROUNDS);

  const owner = await prisma.$transaction(async (tx) => {
    const shop = await tx.shop.create({ data: { name: shopName } });
    return tx.user.create({
      data: {
        shopId: shop.id,
        name: ownerName,
        username,
        passwordHash,
        role: UserRole.OWNER,
      },
    });
  });

  console.log(`[bootstrap-owner] Created shop "${shopName}" and OWNER "${username}" (user #${owner.id}).`);
}

bootstrapOwner()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('[bootstrap-owner] Failed:', error instanceof Error ? error.message : error);
    await prisma.$disconnect();
    process.exit(1);
  });
