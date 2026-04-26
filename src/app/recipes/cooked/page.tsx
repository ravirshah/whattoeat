import { CookedLogTimeline } from '@/components/feature/recipes/CookedLogTimeline';
import { listCookedLog } from '@/server/recipes/actions';

export const metadata = { title: 'Cooked Log — WhatToEat' };

export default async function CookedLogPage() {
  const entries = await listCookedLog(30);

  return (
    <main className="mx-auto max-w-2xl px-4 pt-6 pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-text">Cooked</h1>
        <p className="text-sm text-text-muted mt-1">Last 30 days</p>
      </div>
      <CookedLogTimeline entries={entries} />
    </main>
  );
}
