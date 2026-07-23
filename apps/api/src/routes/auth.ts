import { loginSchema, registerSchema } from '@shop/shared';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { asyncHandler } from '../lib/asyncHandler';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { createShopWithOwner, login } from '../services/auth';

// Rate-limit the public auth endpoints per client IP. Skipped under test so the
// suite's many login/register calls from a single IP don't trip the limiter.
const skipInTests = () => process.env.NODE_ENV === 'test';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please try again later.' } },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many sign-up attempts. Please try again later.' } },
});

export const authRouter = Router();

authRouter.post(
  '/auth/login',
  loginLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { token, user } = await login(req.body.username, req.body.pin);

    res.json({ token, user });
  }),
);

authRouter.post(
  '/auth/register',
  registerLimiter,
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const result = await createShopWithOwner(req.body);

    res.status(201).json(result);
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
