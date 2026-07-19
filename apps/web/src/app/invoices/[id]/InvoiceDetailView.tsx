'use client';

import { useCallback, useEffect, useRef } from 'react';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingBlock } from '@/components/ui/LoadingRow';
import { useShop } from '@/context/ShopContext';
import { useAsync } from '@/hooks/useAsync';
import { getInvoice } from '@/lib/api';
import { formatCurrency, formatDateTime, formatQuantity } from '@/lib/format';

function PrinterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M4.5 6V2.5h7V6M4.5 12.5h7V9h2.5V7a1 1 0 0 0-1-1h-10a1 1 0 0 0-1 1v2h2.5v3.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M4.5 9h7v4.5h-7Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

export function InvoiceDetailView({ invoiceId }: { invoiceId: number }) {
  const { selectedShopId } = useShop();
  const hasAutoPrintedRef = useRef(false);

  const fetcher = useCallback(() => {
    if (selectedShopId === null) {
      return Promise.reject(new Error('No shop selected'));
    }
    return getInvoice(selectedShopId, invoiceId);
  }, [selectedShopId, invoiceId]);

  const { data: invoice, isLoading, error, retry } = useAsync(fetcher);

  // ?print=1 (set by the Sell checkout redirect) opens the print dialog once the
  // receipt has actually loaded, so the print preview never captures a loading state.
  // The ref guard keeps a second render of `invoice` from popping it again.
  useEffect(() => {
    if (!invoice || hasAutoPrintedRef.current) {
      return;
    }
    const shouldAutoPrint = new URLSearchParams(window.location.search).get('print') === '1';
    if (shouldAutoPrint) {
      hasAutoPrintedRef.current = true;
      window.print();
    }
  }, [invoice]);

  if (selectedShopId === null) {
    return <EmptyState title="Select a shop" description="Choose a shop from the header above to see this invoice." />;
  }
  if (isLoading) {
    return <LoadingBlock label="Loading invoice…" />;
  }
  if (error) {
    return <ErrorState error={error} onRetry={retry} title="Could not load this invoice" />;
  }
  if (!invoice) {
    return null;
  }

  const shopMetaLine = [invoice.shop.phone && `Ph: ${invoice.shop.phone}`, invoice.shop.gstin && `GSTIN: ${invoice.shop.gstin}`]
    .filter(Boolean)
    .join('   ·   ');

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex w-full max-w-[440px] items-center justify-between print:hidden">
        <div>
          <h1 className="font-display text-xl font-bold tracking-wide text-ink-50 uppercase">Invoice</h1>
          <p className="mt-0.5 font-mono text-sm text-ink-500">{invoice.invoiceNumber}</p>
        </div>
        <Button variant="primary" onClick={() => window.print()}>
          <PrinterIcon />
          Print
        </Button>
      </div>

      <div className="w-full max-w-[440px] rounded-md border border-ink-200 bg-ink-50 p-6 text-ink-950 shadow-2xl shadow-black/40 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <div className="text-center">
          <p className="font-display text-lg font-bold tracking-wide uppercase">{invoice.shop.name}</p>
          {invoice.shop.address ? <p className="mt-1 text-xs text-ink-600">{invoice.shop.address}</p> : null}
          {shopMetaLine ? <p className="mt-1 font-mono text-xs text-ink-600">{shopMetaLine}</p> : null}
        </div>

        <div className="my-4 border-t border-dashed border-ink-300" />

        <div className="flex items-start justify-between text-xs">
          <div>
            <p className="tracking-[0.1em] text-ink-500 uppercase">Invoice #</p>
            <p className="font-mono font-semibold">{invoice.invoiceNumber}</p>
          </div>
          <div className="text-right">
            <p className="tracking-[0.1em] text-ink-500 uppercase">Date</p>
            <p className="font-mono">{formatDateTime(invoice.createdAt)}</p>
          </div>
        </div>

        <div className="mt-3 flex items-start justify-between text-xs">
          <div>
            <p className="tracking-[0.1em] text-ink-500 uppercase">Served by</p>
            <p>{invoice.salesmanName}</p>
          </div>
          {invoice.customerName ? (
            <div className="text-right">
              <p className="tracking-[0.1em] text-ink-500 uppercase">Customer</p>
              <p>{invoice.customerName}</p>
              {invoice.customerPhone ? <p className="font-mono text-ink-500">{invoice.customerPhone}</p> : null}
            </div>
          ) : null}
        </div>

        <div className="my-4 border-t border-dashed border-ink-300" />

        <table className="w-full text-xs">
          <thead>
            <tr className="text-[10px] tracking-[0.1em] text-ink-500 uppercase">
              <th className="pb-1.5 text-left font-medium">Item</th>
              <th className="pb-1.5 text-right font-medium">Qty</th>
              <th className="pb-1.5 text-right font-medium">Price</th>
              <th className="pb-1.5 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((line) => (
              <tr key={line.id} className="border-t border-dashed border-ink-200">
                <td className="py-1.5 pr-2">
                  {line.partName}
                  <span className="block font-mono text-[10px] text-ink-500">{line.partSku}</span>
                </td>
                <td className="py-1.5 text-right font-mono tabular-nums">{formatQuantity(line.quantity)}</td>
                <td className="py-1.5 text-right font-mono tabular-nums">{formatCurrency(line.unitPrice)}</td>
                <td className="py-1.5 text-right font-mono tabular-nums">{formatCurrency(line.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3 flex items-center justify-between border-t-2 border-ink-950 pt-3">
          <p className="font-display text-sm font-bold tracking-wide uppercase">Total</p>
          <p className="font-mono text-xl font-bold tabular-nums">{formatCurrency(invoice.total)}</p>
        </div>

        {invoice.notes ? <p className="mt-4 text-xs text-ink-600 italic">{invoice.notes}</p> : null}

        <p className="mt-6 text-center text-[10px] tracking-[0.2em] text-ink-400 uppercase">Thank you for your business</p>
      </div>
    </div>
  );
}
