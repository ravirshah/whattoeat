import { OnboardingStepper } from '@/components/feature/home/OnboardingStepper';
import { isOnboardingComplete } from '@/lib/onboarding';
import { createServerClient } from '@/lib/supabase/server';
import { getUserId } from '@/server/auth';
import { getPartialProfileForOnboarding } from '@/server/profile/onboarding-query';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

interface Props {
  children: React.ReactNode;
}

export default async function OnboardingLayout({ children }: Props) {
  const userId = await getUserId();

  if (!userId) {
    redirect('/auth/login');
  }

  const supabase = await createServerClient();
  const profile = await getPartialProfileForOnboarding(userId, supabase);

  // If onboarding already complete, send to home.
  if (isOnboardingComplete(profile)) {
    redirect('/home');
  }

  // Derive active step from the current URL so the stepper highlights the right circle.
  // e.g. /onboarding/step/2 → stepNum = 2
  const headersList = await headers();
  const pathname = headersList.get('x-invoke-path') ?? headersList.get('referer') ?? '';
  const stepMatch = pathname.match(/\/onboarding\/step\/(\d+)/);
  const activeStep = stepMatch ? Number.parseInt(stepMatch[1] ?? '0', 10) : undefined;

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      {/* Header */}
      <header className="py-6 px-4 flex items-center justify-center border-b border-border">
        <span className="text-xl font-semibold tracking-tight text-foreground">WhatToEat</span>
      </header>

      {/* Stepper progress bar */}
      <div className="px-4 pt-8 pb-4 flex justify-center">
        <OnboardingStepper profile={profile} activeStep={activeStep} />
      </div>

      {/* Step content */}
      <main className="flex-1 flex items-start justify-center px-4 pb-16">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
