export default function Loading() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="h-7 w-48 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
        ))}
      </div>
      <div className="h-72 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
      <div className="h-72 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
    </div>
  );
}
