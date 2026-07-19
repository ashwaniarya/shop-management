import type { InventoryItem, Part, Prisma } from '@prisma/client';

import { requirePart } from '../lib/assertExists';
import { prisma } from '../lib/prisma';
import { DomainValidationError, NotFoundError } from './errors';

// Non-transactional pre-checks, like the FK pre-checks in routes/parts.ts: a
// concurrent PATCH can slip a new copy in between check and write. Accepted —
// the DB CHECK part_copy_of_not_self still backstops self-links.
export async function validateCopyOfTarget(selfId: number | null, copyOfPartId: number): Promise<void> {
  if (selfId !== null && copyOfPartId === selfId) {
    throw new DomainValidationError('A part cannot be a copy of itself');
  }

  const target = await requirePart(copyOfPartId);

  if (target.copyOfPartId !== null) {
    throw new DomainValidationError(
      `Part ${copyOfPartId} is itself a copy; link to its original (part ${target.copyOfPartId}) instead`,
    );
  }

  if (selfId !== null) {
    const linkedCopyCount = await prisma.part.count({ where: { copyOfPartId: selfId } });
    if (linkedCopyCount > 0) {
      throw new DomainValidationError(`Part ${selfId} has copies linked to it and cannot itself become a copy`);
    }
  }
}

type PartWithGrade = Prisma.PartGetPayload<{ include: { grade: true } }>;

export interface FamilyMember {
  part: PartWithGrade;
  inventoryItem: InventoryItem | null;
}

export interface PartFamily {
  original: FamilyMember;
  copies: FamilyMember[];
}

export async function resolveFamily(part: Part, shopId?: number): Promise<PartFamily> {
  const rootId = part.copyOfPartId ?? part.id;

  const members = await prisma.part.findMany({
    where: { OR: [{ id: rootId }, { copyOfPartId: rootId }] },
    include: { grade: true },
  });

  const originalRow = members.find((member) => member.id === rootId);
  if (!originalRow) {
    throw new NotFoundError(`Part ${rootId} not found`);
  }

  const inventoryByPartId = new Map<number, InventoryItem>();
  if (shopId !== undefined) {
    const inventoryItems = await prisma.inventoryItem.findMany({
      where: { shopId, partId: { in: members.map((member) => member.id) } },
    });
    for (const inventoryItem of inventoryItems) {
      inventoryByPartId.set(inventoryItem.partId, inventoryItem);
    }
  }

  // Sorted in JS rather than via Prisma orderBy: ordering on a nullable
  // relation's column can't express "ungraded last" reliably
  const copyRows = members
    .filter((member) => member.id !== rootId)
    .sort(
      (left, right) =>
        (left.grade?.displayOrder ?? Number.MAX_SAFE_INTEGER) -
          (right.grade?.displayOrder ?? Number.MAX_SAFE_INTEGER) || left.id - right.id,
    );

  const toFamilyMember = (memberPart: PartWithGrade): FamilyMember => ({
    part: memberPart,
    inventoryItem: inventoryByPartId.get(memberPart.id) ?? null,
  });

  return { original: toFamilyMember(originalRow), copies: copyRows.map(toFamilyMember) };
}
