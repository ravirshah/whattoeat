import { requireUser } from '@/server/auth';
import { redirect } from 'next/navigation';
import { HealthDocEditClient } from './client';

/**
 * Standalone health-document import — reachable from the profile edit page.
 * Allows users who skipped this during onboarding to run it later.
 */
export default async function ProfileHealthPage() {
  // Ensure the user is authenticated before rendering.
  try {
    await requireUser();
  } catch {
    redirect('/auth/login');
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <header className="py-6 px-4 flex items-center border-b border-border">
        <a
          href="/profile/edit"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          &larr; Back to profile
        </a>
        <h1 className="text-lg font-semibold text-foreground mx-auto pr-16">Import health data</h1>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-sm px-6 py-8">
          <p className="text-sm text-muted-foreground mb-6">
            Paste labs, a body composition scan, fitness tracker export, or training plan. We
            extract what matters and suggest conservative adjustments — nothing is applied without
            your confirmation.
          </p>
          <HealthDocEditClient />
        </div>
      </main>
    </div>
  );
}
