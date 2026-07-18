import { CategoryTreeView } from '@/components/admin/categories/CategoryTreeView';

export default function CategoriesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-wide text-ink-50 uppercase">Categories</h1>
        <p className="mt-1 text-sm text-ink-500">The parts catalog&rsquo;s category tree.</p>
      </div>

      <CategoryTreeView />
    </div>
  );
}
