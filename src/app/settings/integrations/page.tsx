import { IntegrationsView } from '@/components/feature/integrations/IntegrationsView';
import { listMyIntegrations } from '@/server/integrations/actions';
import { redirect } from 'next/navigation';

export const metadata = { title: 'Integrations — WhatToEat' };

export default async function IntegrationsPage() {
  const result = await listMyIntegrations();
  if (!result.ok) {
    if (result.error.code === 'unauthorized') redirect('/auth/login');
    throw new Error(result.error.message);
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8">
      <IntegrationsView initialIntegrations={result.value} />
    </main>
  );
}
