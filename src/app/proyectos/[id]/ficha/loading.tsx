export default function LoadingFicha() {
  return (
    <div className="flex flex-col flex-1 dark:bg-slate-950 bg-slate-50 min-h-screen">
      <div className="sticky top-[52px] z-30 border-b dark:border-white/[0.06] border-slate-200 dark:bg-slate-950/80 bg-white/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 py-3 flex gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-6 w-20 rounded-full dark:bg-slate-800 bg-slate-200 animate-pulse" />
          ))}
        </div>
      </div>
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-40 rounded-2xl dark:bg-slate-900 bg-white border dark:border-white/[0.06] border-slate-200 animate-pulse" />
        ))}
      </main>
    </div>
  );
}
