export default function LoadingCronograma() {
  return (
    <div className="p-4 md:p-6 space-y-6 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-700" />
        <div className="space-y-2">
          <div className="h-5 w-44 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-3 w-28 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
      <div className="h-10 w-full rounded-lg bg-gray-200 dark:bg-gray-700" />
      <div className="h-80 rounded-xl bg-gray-200 dark:bg-gray-700" />
    </div>
  );
}
