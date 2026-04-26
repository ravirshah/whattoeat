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

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Pantry</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {items.length === 0
            ? 'Add the ingredients you have on hand.'
            : `${items.length} item${items.length === 1 ? '' : 's'} — ${items.filter((i) => i.available).length} available`}
        </p>
      </header>

      <Suspense fallback={null}>
        <PantryClientIsland initialItems={items} />
      </Suspense>
    </main>
  );
}
