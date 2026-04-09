export default function LoadingProyectoHub() {
  return (
    <div className="flex flex-col flex-1 min-h-screen dark:bg-slate-950 bg-slate-50">
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Breadcrumb */}
        <div className="h-4 w-24 rounded-full dark:bg-slate-800 bg-slate-200 animate-pulse mb-8" />
        {/* Title */}
        <div className="mb-8 space-y-2">
          <div className="h-7 w-48 rounded-lg dark:bg-slate-800 bg-slate-200 animate-pulse" />
          <div className="h-4 w-72 rounded-full dark:bg-slate-800 bg-slate-200 animate-pulse" />
        </div>
        {/* Module grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-48 rounded-2xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900 bg-white animate-pulse"
            />
          ))}
        </div>
      </main>
    </div>
  );
}
