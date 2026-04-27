import { OnboardingStepFrame } from '@/components/feature/home/OnboardingStepFrame';
import { HealthDocStepClient } from './client';

/**
 * Optional health-document import step — reachable at /onboarding/health.
 * Wired into the onboarding flow after step 2 (Body Data) via the
 * "Import from a health document" link on BodyDataStep.
 * Skipping redirects straight to /onboarding/step/3 (Confirm Targets).
 */
export default function HealthDocOnboardingPage() {
  return (
    <OnboardingStepFrame
      step={3}
      totalSteps={5}
      title="Import health data"
      description="Paste your labs, body scan, or training plan — or skip."
      showBack
    >
      <HealthDocStepClient />
    </OnboardingStepFrame>
  );
}
