'use client';

import { useRouter } from 'next/navigation';
import { useReducer, useState } from 'react';

import { PosCartTable } from '@/components/pos/PosCartTable';
import { PosCustomerFields } from '@/components/pos/PosCustomerFields';
import { PosPartSearch } from '@/components/pos/PosPartSearch';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormError } from '@/components/ui/FormError';
import { LoadingBlock } from '@/components/ui/LoadingRow';
import { useShop } from '@/context/ShopContext';
import { useZodSubmit } from '@/hooks/useZodSubmit';
import { createInvoice } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { cartTotal, posCartReducer } from '@/lib/posCart';
import { invoiceCreateSchema } from '@shop/shared';

export default function SellPage() {
  const { shops, isLoading, selectedShopId } = useShop();
  const router = useRouter();
  const [cart, dispatch] = useReducer(posCartReducer, []);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const { submitError, isSubmitting, run } = useZodSubmit(
    invoiceCreateSchema,
    (data) => {
      if (selectedShopId === null) {
        return Promise.reject(new Error('No shop selected'));
      }
      return createInvoice(selectedShopId, data);
    },
    {
      onSuccess: (invoice) => {
        dispatch({ type: 'CLEAR' });
        router.push(`/invoices/${invoice.id}?print=1`);
      },
    },
  );

  function handleCheckout() {
    run({
      customerName: customerName.trim() === '' ? null : customerName.trim(),
      customerPhone: customerPhone.trim() === '' ? null : customerPhone.trim(),
      lines: cart.map((line) => ({ partId: line.partId, quantity: line.quantity, unitPrice: line.unitPrice })),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-wide text-ink-50 uppercase">Sell</h1>
        <p className="mt-1 text-sm text-ink-500">Search a part, build the cart, check out.</p>
      </div>

      {isLoading ? (
        <LoadingBlock label="Loading shops…" />
      ) : shops.length === 0 ? (
        <EmptyState title="No shops configured yet" description="Add a shop from the Shops screen before ringing up a sale." />
      ) : selectedShopId === null ? (
        <EmptyState title="Select a shop" description="Choose a shop from the header above to start selling." />
      ) : (
        <>
          <PosPartSearch shopId={selectedShopId} onAddPart={(part) => dispatch({ type: 'ADD_PART', part })} />
          <PosCustomerFields
            customerName={customerName}
            customerPhone={customerPhone}
            onCustomerNameChange={setCustomerName}
            onCustomerPhoneChange={setCustomerPhone}
          />
          <PosCartTable cart={cart} dispatch={dispatch} />

          <div className="sticky bottom-0 z-10 -mx-4 border-t border-ink-800 bg-ink-900/95 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-medium tracking-[0.14em] text-ink-500 uppercase">Total</p>
                <p className="font-mono text-2xl font-semibold tabular-nums text-ink-50">{formatCurrency(cartTotal(cart))}</p>
              </div>
              <Button
                type="button"
                variant="primary"
                size="lg"
                isLoading={isSubmitting}
                disabled={cart.length === 0}
                onClick={handleCheckout}
              >
                Checkout
              </Button>
            </div>
            <FormError error={submitError} />
          </div>
        </>
      )}
    </div>
  );
}
