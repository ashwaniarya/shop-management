import { z } from 'zod';

export const vehicleModelSchema = z.object({
  id: z.number().int(),
  vehicleMakeId: z.number().int(),
  vehicleClassId: z.number().int(),
  name: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type VehicleModel = z.infer<typeof vehicleModelSchema>;

export const vehicleModelCreateSchema = z.object({
  vehicleMakeId: z.number().int(),
  vehicleClassId: z.number().int(),
  name: z.string().min(1, 'name must not be empty'),
});
export type VehicleModelCreate = z.infer<typeof vehicleModelCreateSchema>;

export const vehicleModelUpdateSchema = vehicleModelCreateSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type VehicleModelUpdate = z.infer<typeof vehicleModelUpdateSchema>;
