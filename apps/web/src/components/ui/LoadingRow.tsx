export function LoadingRow({ columnCount }: { columnCount: number }) {
  return (
    <tr>
      {Array.from({ length: columnCount }).map((_, index) => (
        <td key={index} className="border-b border-ink-850 px-3 py-2.5">
          <div className="animate-skeleton h-3.5 w-full max-w-32 rounded-[3px] bg-ink-800" />
        </td>
      ))}
    </tr>
  );
}

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-md border border-ink-800 py-10 text-xs text-ink-500">
      <span className="animate-skeleton h-2 w-2 rounded-full bg-ink-600" />
      {label}
    </div>
  );
}
