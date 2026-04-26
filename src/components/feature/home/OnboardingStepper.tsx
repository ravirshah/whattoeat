'use client';

import { cn } from '@/components/ui/utils';
import type { Profile } from '@/contracts/zod/profile';
import type { OnboardingStepMeta } from '@/lib/onboarding';
import { CheckIcon } from 'lucide-react';

interface OnboardingStepperProps {
  steps: readonly OnboardingStepMeta[];
  profile: Partial<Profile> | null;
  /** The currently active step number (1-indexed). */
  activeStep?: number;
}

export function OnboardingStepper({ steps, profile, activeStep }: OnboardingStepperProps) {
  return (
    <nav aria-label="Onboarding progress" className="w-full max-w-md">
      <ol className="flex items-center gap-0">
        {steps.map((s, idx) => {
          const complete = s.isComplete(profile);
          const active = s.step === activeStep;
          const isLast = idx === steps.length - 1;

          return (
            <li key={s.step} className="flex items-center flex-1 last:flex-none">
              {/* Circle */}
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors duration-200',
                    complete && 'bg-accent border-accent text-accent-foreground',
                    active && !complete && 'border-accent text-accent bg-background',
                    !complete && !active && 'border-border text-muted-foreground bg-background',
                  )}
                  aria-current={active ? 'step' : undefined}
                >
                  {complete ? (
                    <CheckIcon className="w-4 h-4" strokeWidth={2.5} />
                  ) : (
                    <span>{s.step}</span>
                  )}
                </div>
                <span
                  className={cn(
                    'text-[10px] font-medium hidden sm:block',
                    complete || active ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {s.title}
                </span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-2 rounded-full transition-colors duration-200',
                    complete ? 'bg-accent' : 'bg-border',
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
