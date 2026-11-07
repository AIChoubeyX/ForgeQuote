export function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="py-16 text-center text-sm text-ink-soft flex flex-col items-center justify-center gap-3">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-forge" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ title, message }) {
  return (
    <div className="py-16 text-center">
      <h3 className="font-display text-lg font-normal text-ink">{title}</h3>
      <p className="mt-1 text-sm text-ink-soft">{message}</p>
    </div>
  );
}

export function ErrorState({ message = 'Unable to load this page.' }) {
  return (
    <div className="rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
      {message}
    </div>
  );
}
