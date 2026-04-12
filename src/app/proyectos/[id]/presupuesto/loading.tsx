export default function LoadingPresupuesto() {
  return (
    <div className="p-4 md:p-6 space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-700" />
          <div className="space-y-2">
            <div className="h-5 w-48 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 w-32 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
        <div className="h-9 w-36 rounded-lg bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-gray-200 dark:bg-gray-700" />
        ))}
      </div>
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="h-10 bg-gray-200 dark:bg-gray-700" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 border-t border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    </div>
  );
}
