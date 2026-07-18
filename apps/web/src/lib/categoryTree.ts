import type { Category } from '@shop/shared';

export interface CategoryOption {
  id: number;
  label: string;
  depth: number;
}

// Categories arrive as a flat, unordered list (one parent level deep in practice,
// but this walks arbitrarily deep). This orders them parent-then-children, each
// level prefixed for a flat <select> that still reads as a tree.
export function buildCategoryOptions(categories: Category[]): CategoryOption[] {
  const childrenByParentId = new Map<number | null, Category[]>();
  for (const category of categories) {
    const bucket = childrenByParentId.get(category.parentCategoryId) ?? [];
    bucket.push(category);
    childrenByParentId.set(category.parentCategoryId, bucket);
  }
  for (const bucket of childrenByParentId.values()) {
    bucket.sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
  }

  const options: CategoryOption[] = [];
  function visit(parentId: number | null, depth: number): void {
    for (const category of childrenByParentId.get(parentId) ?? []) {
      options.push({ id: category.id, label: `${'—'.repeat(depth)}${depth > 0 ? ' ' : ''}${category.name}`, depth });
      visit(category.id, depth + 1);
    }
  }
  visit(null, 0);

  return options;
}
