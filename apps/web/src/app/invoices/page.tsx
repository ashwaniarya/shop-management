'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingBlock, LoadingRow } from '@/components/ui/LoadingRow';
import { Pagination } from '@/components/ui/Pagination';
import { Table, Td, Th, Tr } from '@/components/ui/Table';
import { useShop } from '@/context/ShopContext';
import { usePaginatedList } from '@/hooks/usePaginatedList';
import { listInvoices } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/format';

const PAGE_SIZE = 20;
const COLUMN_COUNT = 5;

export default function InvoicesPage() {
  const { shops, isLoading, selectedShopId } = useShop();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-wide text-ink-50 uppercase">Invoices</h1>
        <p className="mt-1 text-sm text-ink-500">Every sale rung up at this shop, newest first.</p>
      </div>

      {isLoading ? (
        <LoadingBlock label="Loading shops…" />
      ) : shops.length === 0 ? (
        <EmptyState title="No shops configured yet" description="Add a shop from the Shops screen before selling." />
      ) : selectedShopId === null ? (
        <EmptyState title="Select a shop" description="Choose a shop from the header above to see its invoices." />
      ) : (
        <InvoicesTable shopId={selectedShopId} />
      )}
    </div>
  );
}

function InvoicesTable({ shopId }: { shopId: number }) {
  const router = useRouter();
  const fetchPage = useCallback((page: number) => listInvoices(shopId, { page, limit: PAGE_SIZE }), [shopId]);
  const { data: invoices, meta, isLoading, error, setPage, refetch } = usePaginatedList(fetchPage);

  if (error) {
    return <ErrorState error={error} onRetry={refetch} title="Could not load invoices" />;
  }

  return (
    <div className="flex flex-col gap-2">
      <Table>
        <thead>
          <tr>
            <Th>Invoice #</Th>
            <Th>Date</Th>
            <Th>Customer</Th>
            <Th align="right">Items</Th>
            <Th align="right">Total</Th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: 8 }).map((_, index) => <LoadingRow key={index} columnCount={COLUMN_COUNT} />)
          ) : invoices.length === 0 ? (
            <tr>
              <td colSpan={COLUMN_COUNT} className="p-0">
                <EmptyState title="No invoices yet" description="Sales rung up from Sell will show up here." />
              </td>
            </tr>
          ) : (
            invoices.map((invoice) => (
              <Tr key={invoice.id} onClick={() => router.push(`/invoices/${invoice.id}`)}>
                <Td mono>
                  <Link
                    href={`/invoices/${invoice.id}`}
                    className="text-ink-100 hover:text-accent-400"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {invoice.invoiceNumber}
                  </Link>
                </Td>
                <Td className="text-ink-400">{formatDateTime(invoice.createdAt)}</Td>
                <Td>{invoice.customerName ?? 'Walk-in'}</Td>
                <Td align="right" mono>
                  {invoice.itemCount}
                </Td>
                <Td align="right" mono className="text-ink-50">
                  {formatCurrency(invoice.total)}
                </Td>
              </Tr>
            ))
          )}
        </tbody>
      </Table>
      {meta ? <Pagination meta={meta} onPageChange={setPage} /> : null}
    </div>
  );
}
