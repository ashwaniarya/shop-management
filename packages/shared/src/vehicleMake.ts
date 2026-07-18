import { z } from 'zod';

export const vehicleMakeSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type VehicleMake = z.infer<typeof vehicleMakeSchema>;

export const vehicleMakeCreateSchema = z.object({
  name: z.string(),
});
export type VehicleMakeCreate = z.infer<typeof vehicleMakeCreateSchema>;

export const vehicleMakeUpdateSchema = vehicleMakeCreateSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type VehicleMakeUpdate = z.infer<typeof vehicleMakeUpdateSchema>;
