export default function PantryLoading() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <div className="h-8 w-32 rounded bg-muted animate-pulse" />
        <div className="mt-1 h-4 w-48 rounded bg-muted animate-pulse" />
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
          <div key={i} className="h-8 w-24 rounded-full bg-muted animate-pulse" />
        ))}
      </div>
    </main>
  );
}
