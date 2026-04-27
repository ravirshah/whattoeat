'use client';

import { HealthDocStep } from '@/components/feature/onboarding/HealthDocStep';
import { useRouter } from 'next/navigation';

export function HealthDocEditClient() {
  const router = useRouter();

  function handleApplied() {
    router.push('/profile');
  }

  function handleSkip() {
    router.push('/profile/edit');
  }

  return <HealthDocStep onApplied={handleApplied} onSkip={handleSkip} />;
}
