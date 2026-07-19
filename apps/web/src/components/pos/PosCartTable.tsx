'use client';

import type { Dispatch } from 'react';

import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Table, Td, Th, Tr } from '@/components/ui/Table';
import { formatCurrency } from '@/lib/format';
import { cartTotal, type PosCartAction, type PosCartLine } from '@/lib/posCart';

interface PosCartTableProps {
  cart: PosCartLine[];
  dispatch: Dispatch<PosCartAction>;
}

function MinusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2.5 7h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M7 2.5v9M2.5 7h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3 4.5h10M6.5 4.5V3a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1.5M4.5 4.5v8a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1v-8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PosCartTable({ cart, dispatch }: PosCartTableProps) {
  if (cart.length === 0) {
    return <EmptyState title="Cart is empty" description="Search for a part above to start ringing up this sale." />;
  }

  return (
    <Table>
      <thead>
        <tr>
          <Th>Part</Th>
          <Th align="right">Qty</Th>
          <Th align="right">Unit price</Th>
          <Th align="right">Line total</Th>
          <Th>
            <span className="sr-only">Remove</span>
          </Th>
        </tr>
      </thead>
      <tbody>
        {cart.map((line) => (
          <Tr key={line.partId}>
            <Td>
              <p className="text-sm text-ink-100">{line.name}</p>
              <p className="font-mono text-xs text-ink-500">{line.sku}</p>
            </Td>
            <Td align="right">
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  aria-label={`Decrease quantity of ${line.name}`}
                  onClick={() => dispatch({ type: 'SET_QTY', partId: line.partId, quantity: line.quantity - 1 })}
                  disabled={line.quantity <= 1}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-ink-700 text-ink-300 transition-colors hover:border-ink-600 hover:text-ink-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <MinusIcon />
                </button>
                <div className="w-14">
                  <Input
                    aria-label={`Quantity of ${line.name}`}
                    type="number"
                    inputMode="numeric"
                    step="any"
                    min={1}
                    value={line.quantity}
                    onChange={(event) => {
                      const quantity = Number(event.target.value);
                      if (Number.isFinite(quantity) && quantity > 0) {
                        dispatch({ type: 'SET_QTY', partId: line.partId, quantity });
                      }
                    }}
                    className="text-center font-mono tabular-nums"
                  />
                </div>
                <button
                  type="button"
                  aria-label={`Increase quantity of ${line.name}`}
                  onClick={() => dispatch({ type: 'SET_QTY', partId: line.partId, quantity: line.quantity + 1 })}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-ink-700 text-ink-300 transition-colors hover:border-ink-600 hover:text-ink-100 active:scale-95"
                >
                  <PlusIcon />
                </button>
              </div>
            </Td>
            <Td align="right">
              <div className="ml-auto w-24">
                <Input
                  aria-label={`Unit price of ${line.name}`}
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min={0}
                  value={line.unitPrice}
                  onChange={(event) => {
                    const unitPrice = Number(event.target.value);
                    if (Number.isFinite(unitPrice) && unitPrice >= 0) {
                      dispatch({ type: 'SET_PRICE', partId: line.partId, unitPrice });
                    }
                  }}
                  className="text-right font-mono tabular-nums"
                />
              </div>
            </Td>
            <Td align="right" mono className="text-ink-50">
              {formatCurrency(line.quantity * line.unitPrice)}
            </Td>
            <Td align="right">
              <button
                type="button"
                aria-label={`Remove ${line.name} from cart`}
                onClick={() => dispatch({ type: 'REMOVE', partId: line.partId })}
                className="flex h-9 w-9 items-center justify-center rounded-sm text-ink-500 transition-colors hover:bg-accent-950 hover:text-accent-400 active:scale-95"
              >
                <TrashIcon />
              </button>
            </Td>
          </Tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <td
            colSpan={3}
            className="border-b-0 border-t border-ink-800 px-3 py-3 text-right text-xs font-medium tracking-wide text-ink-400 uppercase"
          >
            Grand total
          </td>
          <td className="border-b-0 border-t border-ink-800 px-3 py-3 text-right font-mono text-lg font-semibold tabular-nums text-accent-400">
            {formatCurrency(cartTotal(cart))}
          </td>
          <td className="border-b-0 border-t border-ink-800" />
        </tr>
      </tfoot>
    </Table>
  );
}
