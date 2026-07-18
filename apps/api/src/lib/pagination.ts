import type { Meta, PaginationQuery } from '@shop/shared';

export function toSkipTake(query: PaginationQuery): { skip: number; take: number } {
  return { skip: (query.page - 1) * query.limit, take: query.limit };
}

export function buildMeta(query: PaginationQuery, total: number): Meta {
  return { page: query.page, limit: query.limit, total };
}
