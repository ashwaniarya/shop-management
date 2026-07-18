'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { LoadingBlock } from '@/components/ui/LoadingRow';
import { searchPartsByNumber, type PartSearchMatchedBy, type PartSearchResult } from '@/lib/api';
import { formatCurrency } from '@/lib/format';

const MATCHED_BY_LABEL: Record<PartSearchMatchedBy, string> = {
  SKU: 'SKU',
  MPN: 'Mfr. part #',
  CROSS_REFERENCE: 'Cross-ref',
  SUPPLIER_NUMBER: 'Supplier #',
};

export function PartSearchPanel() {
  const [query, setQuery] = useState('');
  const [searchedFor, setSearchedFor] = useState<string | null>(null);
  const [results, setResults] = useState<PartSearchResult[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  function runSearch() {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return;
    }
    setIsLoading(true);
    setError(null);
    searchPartsByNumber(trimmedQuery, { limit: 20 })
      .then((page) => {
        setResults(page.data);
        setSearchedFor(trimmedQuery);
      })
      .catch(setError)
      .finally(() => setIsLoading(false));
  }

  return (
    <section className="rounded-md border border-ink-700 bg-ink-900 p-4">
      <h2 className="font-display text-sm font-bold tracking-wide text-ink-50 uppercase">Number search</h2>
      <p className="mt-1 text-xs text-ink-500">
        Look up a part by SKU, manufacturer part number, cross-reference, or supplier part number.
      </p>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          runSearch();
        }}
      >
        <Input
          aria-label="Part number"
          placeholder="e.g. 0-001-367-032, MHD-STR-575DI-OE…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="flex-1"
        />
        <Button type="submit" variant="primary" isLoading={isLoading} disabled={query.trim() === ''}>
          Search
        </Button>
      </form>

      {error ? (
        <div className="mt-4">
          <ErrorState error={error} onRetry={runSearch} />
        </div>
      ) : isLoading ? (
        <div className="mt-4">
          <LoadingBlock label="Searching…" />
        </div>
      ) : results !== null ? (
        results.length === 0 ? (
          <p className="mt-4 text-sm text-ink-500">No part matches &ldquo;{searchedFor}&rdquo;.</p>
        ) : (
          <ul className="mt-4 divide-y divide-ink-850">
            {results.map((result) => (
              <li key={`${result.id}-${result.matchedBy}-${result.matchedNumber}`}>
                <Link
                  href={`/parts/${result.id}`}
                  className="flex items-center gap-3 rounded-sm px-1 py-2.5 transition-colors hover:bg-ink-850"
                >
                  <Badge tone="accent">{MATCHED_BY_LABEL[result.matchedBy]}</Badge>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink-100">{result.name}</p>
                    <p className="truncate font-mono text-xs text-ink-500">
                      matched <span className="text-ink-300">{result.matchedNumber}</span>
                      <span className="text-ink-700"> · </span>
                      SKU {result.sku}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-sm tabular-nums text-ink-300">
                    {formatCurrency(result.mrp)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </section>
  );
}
