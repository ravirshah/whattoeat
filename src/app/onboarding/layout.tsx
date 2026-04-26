import { OnboardingStepper } from '@/components/feature/home/OnboardingStepper';
import type { Profile } from '@/contracts/zod/profile';
import { ONBOARDING_STEPS, isOnboardingComplete } from '@/lib/onboarding';
import { createServerClient } from '@/lib/supabase/server';
import { getUserId } from '@/server/auth';
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
  const { data: profileRow } = await supabase
    .from('profiles')
    .select('goal, height_cm, weight_kg, birthdate, sex, activity_level, target_kcal, allergies')
    .eq('user_id', userId)
    .maybeSingle();

  // Normalise DB row to partial Profile shape for onboarding checks.
  const profile: Partial<Profile> | null = profileRow
    ? {
        goal: profileRow.goal as Profile['goal'],
        height_cm: profileRow.height_cm ? Number(profileRow.height_cm) : null,
        weight_kg: profileRow.weight_kg ? Number(profileRow.weight_kg) : null,
        birthdate: profileRow.birthdate ?? null,
        sex: (profileRow.sex as Profile['sex']) ?? null,
        activity_level: (profileRow.activity_level as Profile['activity_level']) ?? null,
        targets: {
          kcal: profileRow.target_kcal ?? 0,
          protein_g: 0,
          carbs_g: 0,
          fat_g: 0,
        },
        allergies: (profileRow.allergies as string[]) ?? [],
      }
    : null;

  // If onboarding already complete, send to home.
  if (isOnboardingComplete(profile)) {
    redirect('/home');
  }

  return (
    <div className="min-h-dvh flex flex-col bg-background">
      {/* Header */}
      <header className="py-6 px-4 flex items-center justify-center border-b border-border">
        <span className="text-xl font-semibold tracking-tight text-foreground">WhatToEat</span>
      </header>

      {/* Stepper progress bar */}
      <div className="px-4 pt-8 pb-4 flex justify-center">
        <OnboardingStepper steps={ONBOARDING_STEPS} profile={profile} />
      </div>

      {/* Step content */}
      <main className="flex-1 flex items-start justify-center px-4 pb-16">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
