'use client';

import { useRef, useState } from 'react';

import { MATCHED_BY_LABEL } from '@/components/parts/matchedByLabel';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { LoadingBlock } from '@/components/ui/LoadingRow';
import { getInventoryItem, searchPartsByNumber, type PartSearchResult } from '@/lib/api';
import { formatCurrency, formatQuantity } from '@/lib/format';
import { resolveLineDefaultPrice } from '@/lib/posCart';
import type { InventoryItem } from '@shop/shared';

const SEARCH_RESULT_LIMIT = 8;

export interface PosPartToAdd {
  partId: number;
  sku: string;
  name: string;
  unitPrice: number;
}

interface PosPartSearchProps {
  shopId: number;
  onAddPart: (part: PosPartToAdd) => void;
}

// Availability is best-effort: a lookup failure just withholds the on-hand hint
// rather than blocking the add — createInvoice is the real stock guard and
// returns a 400 if the sale would overdraw.
function fetchShopInventory(shopId: number, partId: number): Promise<InventoryItem | null> {
  return getInventoryItem(shopId, partId).catch(() => null);
}

export function PosPartSearch({ shopId, onAddPart }: PosPartSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);

  const [query, setQuery] = useState('');
  const [searchedFor, setSearchedFor] = useState<string | null>(null);
  const [results, setResults] = useState<PartSearchResult[] | null>(null);
  const [inventoryByPartId, setInventoryByPartId] = useState<Map<number, InventoryItem | null>>(new Map());
  const [isSearching, setIsSearching] = useState(false);
  const [isCheckingStock, setIsCheckingStock] = useState(false);
  const [error, setError] = useState<unknown>(null);

  function loadAvailability(requestId: number, searchResults: PartSearchResult[]) {
    setIsCheckingStock(true);
    Promise.all(
      searchResults.map((result) =>
        fetchShopInventory(shopId, result.id).then((inventoryItem) => [result.id, inventoryItem] as const),
      ),
    ).then((entries) => {
      if (requestId === requestIdRef.current) {
        setInventoryByPartId(new Map(entries));
        setIsCheckingStock(false);
      }
    });
  }

  function runSearch() {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return;
    }
    const requestId = ++requestIdRef.current;
    setIsSearching(true);
    setError(null);
    searchPartsByNumber(trimmedQuery, { limit: SEARCH_RESULT_LIMIT })
      .then((page) => {
        if (requestId !== requestIdRef.current) {
          return;
        }
        setResults(page.data);
        setSearchedFor(trimmedQuery);
        loadAvailability(requestId, page.data);
      })
      .catch((caughtError: unknown) => {
        if (requestId === requestIdRef.current) {
          setError(caughtError);
        }
      })
      .finally(() => {
        if (requestId === requestIdRef.current) {
          setIsSearching(false);
        }
      });
  }

  function handleAdd(result: PartSearchResult) {
    const inventoryItem = inventoryByPartId.get(result.id) ?? null;
    onAddPart({
      partId: result.id,
      sku: result.sku,
      name: result.name,
      unitPrice: resolveLineDefaultPrice(inventoryItem, result),
    });
    setQuery('');
    setResults(null);
    setSearchedFor(null);
    setInventoryByPartId(new Map());
    inputRef.current?.focus();
  }

  return (
    <section className="rounded-md border border-ink-700 bg-ink-900 p-4">
      <h2 className="font-display text-sm font-bold tracking-wide text-ink-50 uppercase">Find a part</h2>
      <p className="mt-1 text-xs text-ink-500">Search by SKU, manufacturer part number, or cross-reference.</p>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          runSearch();
        }}
      >
        <Input
          ref={inputRef}
          aria-label="Part number"
          placeholder="Scan or type a part number…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="flex-1"
          autoFocus
        />
        <Button type="submit" variant="primary" size="lg" isLoading={isSearching} disabled={query.trim() === ''}>
          Search
        </Button>
      </form>

      {error ? (
        <div className="mt-4">
          <ErrorState error={error} onRetry={runSearch} />
        </div>
      ) : isSearching ? (
        <div className="mt-4">
          <LoadingBlock label="Searching…" />
        </div>
      ) : results !== null ? (
        results.length === 0 ? (
          <p className="mt-4 text-sm text-ink-500">No part matches &ldquo;{searchedFor}&rdquo;.</p>
        ) : (
          <>
            {isCheckingStock ? <p className="mt-3 text-xs text-ink-500">Checking stock…</p> : null}
            <ul className="mt-3 divide-y divide-ink-850">
              {results.map((result) => {
                const inventoryItem = inventoryByPartId.get(result.id);
                const onHand = inventoryItem === undefined ? null : (inventoryItem?.quantityOnHand ?? 0);
                return (
                  <li key={`${result.id}-${result.matchedBy}-${result.matchedNumber}`}>
                    <button
                      type="button"
                      onClick={() => handleAdd(result)}
                      disabled={isCheckingStock}
                      className="flex w-full items-center gap-3 rounded-sm px-1 py-3 text-left transition-colors hover:bg-ink-850 active:scale-[0.99] disabled:cursor-wait disabled:opacity-60"
                    >
                      <Badge tone="accent">{MATCHED_BY_LABEL[result.matchedBy]}</Badge>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-ink-100">{result.name}</p>
                        <p className="truncate font-mono text-xs text-ink-500">
                          SKU <span className="text-ink-300">{result.sku}</span>
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-mono text-sm tabular-nums text-ink-200">{formatCurrency(result.mrp)}</p>
                        <p
                          className={`font-mono text-[11px] tabular-nums ${
                            onHand !== null && onHand > 0 ? 'text-positive-300' : 'text-ink-500'
                          }`}
                        >
                          {onHand === null ? 'checking…' : `${formatQuantity(onHand)} on hand`}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )
      ) : null}
    </section>
  );
}
