import { PantryClientIsland } from '@/components/feature/pantry';
import { createServerClient } from '@/lib/supabase/server';
import { requireUser } from '@/server/auth';
import { listForUser } from '@/server/pantry/repo';
import { Suspense } from 'react';

export const metadata = {
  title: 'Pantry — WhatToEat',
};

export default async function PantryPage() {
  const { userId } = await requireUser();
  const client = await createServerClient();
  const items = await listForUser(client, userId);

  const availableCount = items.filter((i) => i.available).length;

  return (
    <main className="mx-auto max-w-2xl px-4 pb-12 pt-6 sm:pt-8">
      <header className="mb-6 flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-text sm:text-3xl">Pantry</h1>
          {items.length > 0 && (
            <span className="font-mono text-xs font-medium tabular-nums text-text-muted">
              <span className="text-text">{availableCount}</span>
              <span className="opacity-60"> / {items.length}</span> available
            </span>
          )}
        </div>
        <p className="text-sm text-text-muted">
          {items.length === 0
            ? 'Add what you have on hand — your recipes adapt to it.'
            : 'Tap a chip to mark it temporarily unavailable. Long-press to remove.'}
        </p>
      </header>

      <Suspense fallback={null}>
        <PantryClientIsland initialItems={items} />
      </Suspense>
    </main>
  );
}
