'use client';

import { useEffect, useState } from 'react';

import { MATCHED_BY_LABEL } from '@/components/parts/matchedByLabel';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { searchPartsByNumber, type PartSearchResult } from '@/lib/api';

export interface CopyOfPartSelection {
  id: number;
  sku: string;
  name: string;
}

interface CopyOfPartPickerProps {
  value: CopyOfPartSelection | null;
  onSelect: (value: CopyOfPartSelection | null) => void;
}

export function CopyOfPartPicker({ value, onSelect }: CopyOfPartPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PartSearchResult[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const trimmedQuery = query.trim();

  useEffect(() => {
    if (trimmedQuery === '') {
      setResults(null);
      setError(null);
      setIsLoading(false);
      return;
    }
    let isCancelled = false;
    setIsLoading(true);
    setError(null);
    const timeoutId = setTimeout(() => {
      searchPartsByNumber(trimmedQuery, { limit: 8 })
        .then((page) => {
          if (!isCancelled) {
            setResults(page.data);
          }
        })
        .catch((caughtError: unknown) => {
          if (!isCancelled) {
            setError(caughtError);
          }
        })
        .finally(() => {
          if (!isCancelled) {
            setIsLoading(false);
          }
        });
    }, 300);
    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [trimmedQuery]);

  function handlePick(result: PartSearchResult) {
    onSelect({ id: result.id, sku: result.sku, name: result.name });
    setQuery('');
    setResults(null);
  }

  if (value) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-ink-300">Copy of (original part)</span>
        <div className="flex h-9 items-center gap-2 rounded-sm border border-ink-700 bg-ink-900 pr-1 pl-2.5">
          <p className="min-w-0 flex-1 truncate text-sm text-ink-100">
            <span className="font-mono">{value.sku}</span>
            {value.name ? <span className="text-ink-400"> — {value.name}</span> : null}
          </p>
          <Button type="button" size="sm" variant="ghost" onClick={() => onSelect(null)}>
            Clear
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Input
        label="Copy of (original part)"
        placeholder="Optional — search by SKU or part number…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {isLoading ? (
        <p className="text-xs text-ink-500">Searching…</p>
      ) : error ? (
        <p role="alert" className="text-xs text-accent-400">
          Search failed — check the connection and type again.
        </p>
      ) : results !== null ? (
        results.length === 0 ? (
          <p className="text-xs text-ink-500">No part matches &ldquo;{trimmedQuery}&rdquo;.</p>
        ) : (
          <ul className="divide-y divide-ink-850 overflow-hidden rounded-sm border border-ink-800">
            {results.map((result) => (
              <li key={`${result.id}-${result.matchedBy}-${result.matchedNumber}`}>
                <button
                  type="button"
                  onClick={() => handlePick(result)}
                  className="flex w-full items-center gap-2 px-2 py-2 text-left transition-colors hover:bg-ink-850"
                >
                  <Badge tone="accent">{MATCHED_BY_LABEL[result.matchedBy]}</Badge>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink-100">{result.name}</span>
                    <span className="block truncate font-mono text-xs text-ink-500">SKU {result.sku}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
