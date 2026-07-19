// Unit test: fake req/res/next, no DB
import { UserRole } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { ForbiddenError } from '../services/errors';
import { requireRole, requireSameShop } from './authorize';

function fakeRequest(overrides: Partial<Request> = {}): Request {
  return { params: {}, ...overrides } as unknown as Request;
}

const fakeResponse = {} as unknown as Response;

describe('requireRole', () => {
  it('calls next() with no error when req.user has an allowed role', () => {
    const req = fakeRequest({ user: { id: 1, shopId: 1, role: UserRole.OWNER, name: 'Owner' } });
    const next = vi.fn();

    requireRole(UserRole.OWNER, UserRole.MANAGER)(req, fakeResponse, next as NextFunction);

    expect(next).toHaveBeenCalledWith();
  });

  it('calls next(err) with a ForbiddenError when req.user has a disallowed role', () => {
    const req = fakeRequest({ user: { id: 1, shopId: 1, role: UserRole.STAFF, name: 'Staff' } });
    const next = vi.fn();

    requireRole(UserRole.OWNER)(req, fakeResponse, next as NextFunction);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(ForbiddenError);
  });

  it('calls next(err) with a ForbiddenError when req.user is absent', () => {
    const req = fakeRequest();
    const next = vi.fn();

    requireRole(UserRole.OWNER)(req, fakeResponse, next as NextFunction);

    expect(next.mock.calls[0][0]).toBeInstanceOf(ForbiddenError);
  });
});

describe('requireSameShop', () => {
  it('calls next() with no error when req.params.shopId matches req.user.shopId', () => {
    const req = fakeRequest({
      params: { shopId: '7' },
      user: { id: 1, shopId: 7, role: UserRole.OWNER, name: 'Owner' },
    });
    const next = vi.fn();

    requireSameShop()(req, fakeResponse, next as NextFunction);

    expect(next).toHaveBeenCalledWith();
  });

  it('calls next(err) with a ForbiddenError when req.params.shopId does not match req.user.shopId', () => {
    const req = fakeRequest({
      params: { shopId: '7' },
      user: { id: 1, shopId: 9, role: UserRole.OWNER, name: 'Owner' },
    });
    const next = vi.fn();

    requireSameShop()(req, fakeResponse, next as NextFunction);

    expect(next.mock.calls[0][0]).toBeInstanceOf(ForbiddenError);
  });
});
