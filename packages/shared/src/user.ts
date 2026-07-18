import { z } from 'zod';

export const userRoleSchema = z.enum(['OWNER', 'MANAGER', 'STAFF']);
export type UserRole = z.infer<typeof userRoleSchema>;

export const userSchema = z.object({
  id: z.number().int(),
  shopId: z.number().int(),
  name: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  role: userRoleSchema,
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type User = z.infer<typeof userSchema>;

export const userCreateSchema = z.object({
  name: z.string().min(1, 'name must not be empty'),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  role: userRoleSchema,
});
export type UserCreate = z.infer<typeof userCreateSchema>;

export const userUpdateSchema = userCreateSchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type UserUpdate = z.infer<typeof userUpdateSchema>;
