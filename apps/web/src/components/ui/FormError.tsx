// A span (not a p) so it can sit inside inline action rows; role="alert" makes
// screen readers announce the failure when it appears.
export function FormError({ error }: { error: string | null }) {
  if (!error) {
    return null;
  }
  return (
    <span role="alert" className="font-mono text-xs text-accent-400">
      {error}
    </span>
  );
}
