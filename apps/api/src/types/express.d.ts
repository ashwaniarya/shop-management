import type { UserRole } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        shopId: number;
        role: UserRole;
        name: string;
      };
    }
  }
}

export {};
