export default function OfflineLoading() {
  return (
    <main className="min-h-screen bg-surface flex flex-col items-center justify-center px-4 py-16">
      <div className="w-32 h-32 rounded-full border-4 border-border animate-pulse mb-8" />
      <div className="h-7 w-40 rounded-lg bg-surface-elevated animate-pulse mb-3" />
      <div className="h-4 w-64 rounded-lg bg-surface-elevated animate-pulse mb-2" />
      <div className="h-4 w-48 rounded-lg bg-surface-elevated animate-pulse mb-8" />
      <div className="h-10 w-28 rounded-lg bg-surface-elevated animate-pulse" />
    </main>
  );
}
