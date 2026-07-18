export function PlaceholderSection({ title }: { title: string }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
      <p className="mt-2 text-gray-500">Coming soon.</p>
    </div>
  );
}
