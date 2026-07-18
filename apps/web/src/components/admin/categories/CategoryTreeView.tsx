'use client';

import { useCallback, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingBlock } from '@/components/ui/LoadingRow';
import { Table, Td, Th, Tr } from '@/components/ui/Table';
import { useAsync } from '@/hooks/useAsync';
import { deleteCategory, listCategories } from '@/lib/api';
import { buildCategoryOptions, type CategoryOption } from '@/lib/categoryTree';
import type { Category } from '@shop/shared';

import { CategoryFormDialog, type CategoryDialogTarget } from './CategoryFormDialog';

const COLUMN_COUNT = 3;

// useCategoriesLookup (the shared dropdown lookup) doesn't expose a refetch, since
// its callers never mutate categories — this screen does, so it calls the same
// flat listCategories({ limit: 100 }) fetch directly via useAsync to get `retry`.
export function CategoryTreeView() {
  const fetcher = useCallback(() => listCategories({ limit: 100 }).then((page) => page.data), []);
  const { data, isLoading, error, retry: refetch } = useAsync(fetcher);
  const categories = data ?? [];
  const categoriesById = new Map(categories.map((category) => [category.id, category]));

  const [dialogTarget, setDialogTarget] = useState<CategoryDialogTarget>(null);

  if (error) {
    return <ErrorState error={error} onRetry={refetch} title="Could not load categories" />;
  }

  const orderedNodes: { option: CategoryOption; category: Category }[] = [];
  for (const option of buildCategoryOptions(categories)) {
    const category = categoriesById.get(option.id);
    if (category) {
      orderedNodes.push({ option, category });
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-end rounded-md border border-ink-800 bg-ink-900 p-4">
        <Button variant="primary" size="sm" onClick={() => setDialogTarget({ kind: 'create-root' })}>
          Add category
        </Button>
      </div>

      <Table>
        <thead>
          <tr>
            <Th>Name</Th>
            <Th align="right">Display order</Th>
            <Th align="right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={COLUMN_COUNT} className="p-0">
                <LoadingBlock label="Loading categories…" />
              </td>
            </tr>
          ) : orderedNodes.length === 0 ? (
            <tr>
              <td colSpan={COLUMN_COUNT} className="p-0">
                <EmptyState
                  title="No categories yet"
                  description="Add a root category to start organizing the parts catalog."
                  action={
                    <Button variant="secondary" size="sm" onClick={() => setDialogTarget({ kind: 'create-root' })}>
                      Add category
                    </Button>
                  }
                />
              </td>
            </tr>
          ) : (
            orderedNodes.map(({ option, category }) => (
              <Tr key={category.id}>
                <Td style={{ paddingLeft: `${12 + option.depth * 20}px` }}>
                  {option.depth > 0 ? (
                    <span aria-hidden="true" className="mr-1.5 text-ink-700">
                      └
                    </span>
                  ) : null}
                  {category.name}
                </Td>
                <Td align="right" mono className="text-ink-400">
                  {category.displayOrder}
                </Td>
                <Td align="right">
                  <span className="inline-flex items-center gap-1.5">
                    <Button variant="ghost" size="sm" onClick={() => setDialogTarget({ kind: 'create-child', parent: category })}>
                      Add sub
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDialogTarget({ kind: 'edit', category })}>
                      Edit
                    </Button>
                    <ConfirmButton onConfirm={() => deleteCategory(category.id).then(refetch)} />
                  </span>
                </Td>
              </Tr>
            ))
          )}
        </tbody>
      </Table>

      <CategoryFormDialog target={dialogTarget} onClose={() => setDialogTarget(null)} onSaved={refetch} />
    </div>
  );
}
