export function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="py-16 text-center text-sm text-[#A3A3A3] flex flex-col items-center justify-center gap-3">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#292D34] border-t-forge" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ title, message }) {
  return (
    <div className="py-16 text-center">
      <h3 className="font-display text-lg font-semibold text-[#F5F5F5]">{title}</h3>
      <p className="mt-1 text-sm text-[#A3A3A3]">{message}</p>
    </div>
  );
}

export function ErrorState({ message = 'Unable to load this page.' }) {
  return (
    <div className="rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 p-4 text-sm text-[#EF4444]">
      {message}
    </div>
  );
}
