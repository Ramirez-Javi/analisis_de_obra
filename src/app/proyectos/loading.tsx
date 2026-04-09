export default function LoadingProyectos() {
  return (
    <div className="flex flex-col flex-1 min-h-screen dark:bg-slate-950 bg-slate-50">
      {/* Sticky header skeleton */}
      <div className="sticky top-0 z-40 border-b dark:border-white/[0.06] border-slate-200 dark:bg-slate-950/80 bg-white/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <div className="h-4 w-28 rounded-full dark:bg-slate-800 bg-slate-200 animate-pulse" />
        </div>
      </div>
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-end justify-between mb-8">
          <div className="space-y-2">
            <div className="h-7 w-40 rounded-lg dark:bg-slate-800 bg-slate-200 animate-pulse" />
            <div className="h-4 w-56 rounded-full dark:bg-slate-800 bg-slate-200 animate-pulse" />
          </div>
          <div className="h-10 w-36 rounded-xl dark:bg-slate-800 bg-slate-200 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-2xl border dark:border-white/[0.06] border-slate-200 dark:bg-slate-900 bg-white animate-pulse"
            />
          ))}
        </div>
      </main>
    </div>
  );
}
