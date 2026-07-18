'use client';

import { useCallback, useState } from 'react';

import { ACTIVE_FILTER_OPTIONS, filterByActiveState, type ActiveFilterValue } from '@/components/admin/activeFilter';
import { ActivationAction } from '@/components/admin/ActivationAction';
import { ActiveBadge } from '@/components/admin/ActiveBadge';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingRow } from '@/components/ui/LoadingRow';
import { Pagination } from '@/components/ui/Pagination';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Table, Td, Th, Tr } from '@/components/ui/Table';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { listShopUsers, softDeleteShopUser, updateShopUser } from '@/lib/api';
import type { Shop, User, UserRole } from '@shop/shared';

import { ShopUserFormDialog } from './ShopUserFormDialog';

const PAGE_SIZE = 20;
const COLUMN_COUNT = 6;

const ROLE_TONE: Record<UserRole, BadgeTone> = {
  OWNER: 'accent',
  MANAGER: 'neutral',
  STAFF: 'muted',
};

export function ShopUsersPanel({ shop, onBack }: { shop: Shop; onBack: () => void }) {
  const [activeFilter, setActiveFilter] = useState<ActiveFilterValue>('all');
  const [dialogTarget, setDialogTarget] = useState<User | 'new' | null>(null);

  const fetchPage = useCallback((page: number) => listShopUsers(shop.id, { page, limit: PAGE_SIZE }), [shop.id]);
  const { data: users, meta, isLoading, error, page, setPage, refetch } = usePaginatedList(fetchPage);
  const visibleRows = filterByActiveState(users, activeFilter);

  return (
    <div className="flex flex-col gap-3">
      <Button variant="ghost" size="sm" onClick={onBack} className="w-fit">
        ← Back to shops
      </Button>

      {error ? (
        <ErrorState error={error} onRetry={refetch} title="Could not load this shop's users" />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-ink-800 bg-ink-900 p-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-ink-300">Status</span>
              <SegmentedControl label="Status filter" options={ACTIVE_FILTER_OPTIONS} value={activeFilter} onChange={setActiveFilter} />
            </div>
            <Button variant="primary" size="sm" onClick={() => setDialogTarget('new')}>
              Add user
            </Button>
          </div>

          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Phone</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th>Status</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => <LoadingRow key={index} columnCount={COLUMN_COUNT} />)
              ) : visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={COLUMN_COUNT} className="p-0">
                    <EmptyState
                      title="No users match this filter"
                      description={users.length === 0 ? `Add the first user for ${shop.name}.` : 'Try a different status filter.'}
                    />
                  </td>
                </tr>
              ) : (
                visibleRows.map((user) => (
                  <Tr key={user.id} className={user.isActive ? undefined : 'opacity-60'}>
                    <Td>{user.name}</Td>
                    <Td mono className="text-ink-400">
                      {user.phone ?? '—'}
                    </Td>
                    <Td className="text-ink-400">{user.email ?? '—'}</Td>
                    <Td>
                      <Badge tone={ROLE_TONE[user.role]}>{user.role}</Badge>
                    </Td>
                    <Td>
                      <ActiveBadge isActive={user.isActive} />
                    </Td>
                    <Td align="right">
                      <span className="inline-flex items-center gap-1.5">
                        <Button variant="ghost" size="sm" onClick={() => setDialogTarget(user)}>
                          Edit
                        </Button>
                        <ActivationAction
                          isActive={user.isActive}
                          onDeactivate={() => softDeleteShopUser(shop.id, user.id).then(refetch)}
                          onReactivate={() => updateShopUser(shop.id, user.id, { isActive: true }).then(() => refetch())}
                        />
                      </span>
                    </Td>
                  </Tr>
                ))
              )}
            </tbody>
          </Table>
          {meta ? <Pagination meta={meta} onPageChange={setPage} /> : null}

          <ShopUserFormDialog
            shopId={shop.id}
            user={dialogTarget === 'new' || dialogTarget === null ? null : dialogTarget}
            isOpen={dialogTarget !== null}
            onClose={() => setDialogTarget(null)}
            onSaved={refetch}
          />
        </>
      )}
    </div>
  );
}
