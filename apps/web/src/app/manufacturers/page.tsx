import { ManufacturersTable } from '@/components/admin/manufacturers/ManufacturersTable';

export default function ManufacturersPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-wide text-ink-50 uppercase">Manufacturers</h1>
        <p className="mt-1 text-sm text-ink-500">Brands parts are sourced from.</p>
      </div>

      <ManufacturersTable />
    </div>
  );
}
