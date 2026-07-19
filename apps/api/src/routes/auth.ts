import { loginSchema } from '@shop/shared';
import { Router } from 'express';

import { asyncHandler } from '../lib/asyncHandler';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { login } from '../services/auth';

export const authRouter = Router();

authRouter.post(
  '/auth/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { token, user } = await login(req.body.username, req.body.pin);

    res.json({ token, user });
  }),
);

authRouter.get(
  '/auth/me',
  authenticate,
  asyncHandler(async (req, res) => {
    res.json(req.user);
  }),
);

authRouter.post(
  '/auth/logout',
  authenticate,
  asyncHandler(async (_req, res) => {
    res.status(204).end();
  }),
);
