import { AllergensStep } from '@/components/feature/home/AllergensStep';
import { BodyDataStep } from '@/components/feature/home/BodyDataStep';
import { ConfirmTargetsStep } from '@/components/feature/home/ConfirmTargetsStep';
import { GoalStep } from '@/components/feature/home/GoalStep';
import { OnboardingStepFrame } from '@/components/feature/home/OnboardingStepFrame';
import { PantrySeedStep } from '@/components/feature/home/PantrySeedStep';
import type { Profile } from '@/contracts/zod/profile';
import { ONBOARDING_STEPS, ONBOARDING_TOTAL_STEPS } from '@/lib/onboarding';
import { createServerClient } from '@/lib/supabase/server';
import { requireUser } from '@/server/auth';
import { notFound, redirect } from 'next/navigation';

interface Props {
  params: Promise<{ step: string }>;
}

export default async function OnboardingStepPage({ params }: Props) {
  const { step: stepParam } = await params;
  const stepNum = Number.parseInt(stepParam, 10);

  if (Number.isNaN(stepNum) || stepNum < 1 || stepNum > ONBOARDING_TOTAL_STEPS) {
    notFound();
  }

  const { userId } = await requireUser();
  const supabase = await createServerClient();

  const { data: profileRow } = await supabase
    .from('profiles')
    .select(
      'goal, height_cm, weight_kg, birthdate, sex, activity_level, target_kcal, target_protein_g, target_carbs_g, target_fat_g, allergies',
    )
    .eq('user_id', userId)
    .maybeSingle();

  // Normalise DB row to partial Profile shape
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
          protein_g: profileRow.target_protein_g ?? 0,
          carbs_g: profileRow.target_carbs_g ?? 0,
          fat_g: profileRow.target_fat_g ?? 0,
        },
        allergies: (profileRow.allergies as string[]) ?? [],
      }
    : null;

  const stepMeta = ONBOARDING_STEPS[stepNum - 1];
  if (!stepMeta) notFound();

  // Guard: if a previous step is not complete, redirect back to that step.
  for (const s of ONBOARDING_STEPS) {
    if (s.step >= stepNum) break;
    if (!s.isComplete(profile)) {
      redirect(`/onboarding/step/${s.segment}`);
    }
  }

  const stepContent = (() => {
    switch (stepNum) {
      case 1:
        return <GoalStep profile={profile} />;
      case 2:
        return <BodyDataStep profile={profile} />;
      case 3:
        return <ConfirmTargetsStep profile={profile} />;
      case 4:
        return <AllergensStep profile={profile} />;
      case 5:
        return <PantrySeedStep userId={userId} />;
      default:
        notFound();
    }
  })();

  return (
    <OnboardingStepFrame
      step={stepNum}
      totalSteps={ONBOARDING_TOTAL_STEPS}
      title={stepMeta.title}
      description={stepMeta.description}
      showBack={stepNum > 1}
    >
      {stepContent}
    </OnboardingStepFrame>
  );
}

export function generateStaticParams() {
  return ONBOARDING_STEPS.map((s) => ({ step: s.segment }));
}
