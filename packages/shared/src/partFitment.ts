import { z } from 'zod';

export const partFitmentSchema = z.object({
  id: z.number().int(),
  partId: z.number().int(),
  vehicleClassId: z.number().int(),
  vehicleMakeId: z.number().int().nullable(),
  vehicleModelId: z.number().int().nullable(),
  notes: z.string().nullable(),
});
export type PartFitment = z.infer<typeof partFitmentSchema>;

export const partFitmentCreateSchema = z.object({
  vehicleClassId: z.number().int(),
  vehicleMakeId: z.number().int().nullable().optional(),
  vehicleModelId: z.number().int().nullable().optional(),
  notes: z.string().nullable().optional(),
});
export type PartFitmentCreate = z.infer<typeof partFitmentCreateSchema>;
