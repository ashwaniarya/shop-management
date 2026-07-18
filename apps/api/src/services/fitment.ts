import type { Prisma } from '@prisma/client';

import { prisma } from '../lib/prisma';
import { DomainValidationError, NotFoundError } from './errors';

export interface VehicleFilterInput {
  vehicleClassId?: number;
  vehicleMakeId?: number;
  vehicleModelId?: number;
}

export async function buildFitmentWhere(
  input: VehicleFilterInput,
): Promise<Prisma.PartWhereInput | undefined> {
  const { vehicleClassId, vehicleMakeId, vehicleModelId } = input;

  if (vehicleModelId !== undefined) {
    const model = await prisma.vehicleModel.findUnique({ where: { id: vehicleModelId } });
    if (!model) {
      throw new NotFoundError(`Vehicle model ${vehicleModelId} not found`);
    }
    if (vehicleMakeId !== undefined && vehicleMakeId !== model.vehicleMakeId) {
      throw new DomainValidationError(
        `Vehicle model ${vehicleModelId} does not belong to make ${vehicleMakeId}`,
      );
    }
    if (vehicleClassId !== undefined && vehicleClassId !== model.vehicleClassId) {
      throw new DomainValidationError(
        `Vehicle model ${vehicleModelId} does not belong to class ${vehicleClassId}`,
      );
    }

    return {
      fitments: {
        some: {
          OR: [
            { vehicleModelId: model.id },
            { vehicleMakeId: model.vehicleMakeId, vehicleModelId: null },
            { vehicleClassId: model.vehicleClassId, vehicleMakeId: null, vehicleModelId: null },
          ],
        },
      },
    };
  }

  if (vehicleMakeId !== undefined) {
    // vehicleMakeId alone (no model condition) intentionally matches both make-wide
    // rows AND model-specific rows under that make, since every model-level fitment
    // row carries its own make id. A part fitting only "Mahindra 575 DI" still fits
    // a plain "Mahindra" filter.
    if (vehicleClassId !== undefined) {
      return {
        fitments: {
          some: {
            OR: [{ vehicleMakeId }, { vehicleClassId, vehicleMakeId: null, vehicleModelId: null }],
          },
        },
      };
    }
    return { fitments: { some: { vehicleMakeId } } };
  }

  if (vehicleClassId !== undefined) {
    return { fitments: { some: { vehicleClassId } } };
  }

  return undefined;
}

export interface FitmentInput {
  vehicleClassId: number;
  vehicleMakeId?: number;
  vehicleModelId?: number;
}

export async function validateFitmentInput(input: FitmentInput): Promise<void> {
  const { vehicleClassId, vehicleMakeId, vehicleModelId } = input;

  if (vehicleModelId !== undefined && vehicleMakeId === undefined) {
    throw new DomainValidationError('A fitment with a vehicle model also requires a vehicle make');
  }

  const vehicleClass = await prisma.vehicleClass.findUnique({ where: { id: vehicleClassId } });
  if (!vehicleClass) {
    throw new NotFoundError(`Vehicle class ${vehicleClassId} not found`);
  }

  if (vehicleMakeId !== undefined) {
    const vehicleMake = await prisma.vehicleMake.findUnique({ where: { id: vehicleMakeId } });
    if (!vehicleMake) {
      throw new NotFoundError(`Vehicle make ${vehicleMakeId} not found`);
    }
  }

  if (vehicleModelId !== undefined) {
    const vehicleModel = await prisma.vehicleModel.findUnique({ where: { id: vehicleModelId } });
    if (!vehicleModel) {
      throw new NotFoundError(`Vehicle model ${vehicleModelId} not found`);
    }
    if (vehicleModel.vehicleMakeId !== vehicleMakeId || vehicleModel.vehicleClassId !== vehicleClassId) {
      throw new DomainValidationError(
        `Vehicle model ${vehicleModelId} does not belong to make ${vehicleMakeId} and class ${vehicleClassId}`,
      );
    }
  }
}
