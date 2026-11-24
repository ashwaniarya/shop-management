import { loginSchema, registerSchema, upgradePasswordSchema } from '@shop/shared';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { asyncHandler } from '../lib/asyncHandler';
import {
  sessionCookieName,
  sessionCookieOptions,
  upgradeCookieName,
  upgradeCookieOptions,
} from '../lib/authCookies';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { prisma } from '../lib/prisma';
import { createShopWithOwner, login, upgradePassword, verifyUpgradeToken } from '../services/auth';
import { MustChangePasswordError, UnauthorizedError } from '../services/errors';

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
    try {
      const { token, user } = await login(req.body.username, req.body.password);
      res.cookie(sessionCookieName, token, sessionCookieOptions());
      res.json({ user });
    } catch (error) {
      if (error instanceof MustChangePasswordError) {
        res.cookie(upgradeCookieName, error.upgradeToken, upgradeCookieOptions());
        res.status(409).json({
          error: { code: 'MUST_SET_PASSWORD', message: error.message },
        });
        return;
      }
      throw error;
    }
  }),
);

authRouter.post(
  '/auth/register',
  registerLimiter,
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { token, user } = await createShopWithOwner(req.body);
    res.cookie(sessionCookieName, token, sessionCookieOptions());
    res.status(201).json({ user });
  }),
);

authRouter.post(
  '/auth/upgrade-password',
  loginLimiter,
  validate(upgradePasswordSchema),
  asyncHandler(async (req, res) => {
    const upgradeCookie = req.cookies?.[upgradeCookieName];
    if (typeof upgradeCookie !== 'string' || upgradeCookie === '') {
      throw new UnauthorizedError('Password upgrade is invalid or expired');
    }
    const claims = verifyUpgradeToken(upgradeCookie);
    const { token, user } = await upgradePassword(claims.sub, req.body.password);
    res.clearCookie(upgradeCookieName, upgradeCookieOptions());
    res.cookie(sessionCookieName, token, sessionCookieOptions());
    res.json({ user });
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
  asyncHandler(async (req, res) => {
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { tokenVersion: { increment: 1 } },
    });
    res.clearCookie(sessionCookieName, sessionCookieOptions());
    res.status(204).end();
  }),
);
