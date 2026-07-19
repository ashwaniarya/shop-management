import { PartGradesPanel } from '@/components/admin/partGrades/PartGradesPanel';

export default function GradesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-wide text-ink-50 uppercase">Grades</h1>
        <p className="mt-1 text-sm text-ink-500">Quality tiers for parts — Original, 1st Copy, 2nd Copy.</p>
      </div>

      <PartGradesPanel />
    </div>
  );
}
