'use client';

import { HealthDocStep } from '@/components/feature/onboarding/HealthDocStep';
import { useRouter } from 'next/navigation';

export function HealthDocStepClient() {
  const router = useRouter();

  function handleApplied() {
    router.push('/onboarding/step/3');
  }

  function handleSkip() {
    router.push('/onboarding/step/3');
  }

  return <HealthDocStep onApplied={handleApplied} onSkip={handleSkip} />;
}
