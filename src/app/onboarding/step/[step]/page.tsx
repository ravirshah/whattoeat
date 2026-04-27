import { AllergensStep } from '@/components/feature/home/AllergensStep';
import { BodyDataStep } from '@/components/feature/home/BodyDataStep';
import { ConfirmTargetsStep } from '@/components/feature/home/ConfirmTargetsStep';
import { GoalStep } from '@/components/feature/home/GoalStep';
import { OnboardingStepFrame } from '@/components/feature/home/OnboardingStepFrame';
import { PantrySeedStep } from '@/components/feature/home/PantrySeedStep';
import { ONBOARDING_STEPS, ONBOARDING_TOTAL_STEPS } from '@/lib/onboarding';
import { createServerClient } from '@/lib/supabase/server';
import { requireUser } from '@/server/auth';
import { getPartialProfileForOnboarding } from '@/server/profile/onboarding-query';
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

  const profile = await getPartialProfileForOnboarding(userId, supabase);

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
