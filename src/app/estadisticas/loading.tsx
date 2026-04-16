export default function Loading() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="h-8 w-64 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
        ))}
      </div>
      <div className="h-80 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
      <div className="h-80 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
    </div>
  );
}
