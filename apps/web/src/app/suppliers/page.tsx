import { SuppliersTable } from '@/components/admin/suppliers/SuppliersTable';

export default function SuppliersPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-wide text-ink-50 uppercase">Suppliers</h1>
        <p className="mt-1 text-sm text-ink-500">Vendors this shop network sources parts from.</p>
      </div>

      <SuppliersTable />
    </div>
  );
}
