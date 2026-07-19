import { requirePart } from '../lib/assertExists';
import { prisma } from '../lib/prisma';
import { DomainValidationError } from './errors';

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
