export function PlaceholderSection({ title }: { title: string }) {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-wide text-ink-50 uppercase">{title}</h1>
      <p className="mt-2 text-sm text-ink-500">Coming soon — part of the admin screens task.</p>
    </div>
  );
}
