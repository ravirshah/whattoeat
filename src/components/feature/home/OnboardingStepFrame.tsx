import { Separator } from '@/components/ui/separator';
import { cn } from '@/components/ui/utils';
import { ArrowLeftIcon } from 'lucide-react';
import Link from 'next/link';

interface OnboardingStepFrameProps {
  step: number;
  totalSteps: number;
  title: string;
  description: string;
  children: React.ReactNode;
  /** If false, the back button is hidden (used on step 1) */
  showBack?: boolean;
}

export function OnboardingStepFrame({
  step,
  totalSteps,
  title,
  description,
  children,
  showBack = true,
}: OnboardingStepFrameProps) {
  const prevStep = step - 1;

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm px-6 py-8 mt-4">
      {/* Back navigation */}
      {showBack && step > 1 && (
        <Link
          href={`/onboarding/step/${prevStep}`}
          className={cn(
            'inline-flex items-center gap-1.5 text-sm text-muted-foreground',
            'hover:text-foreground transition-colors mb-6',
          )}
        >
          <ArrowLeftIcon className="w-3.5 h-3.5" />
          Back
        </Link>
      )}

      {/* Step header */}
      <div className="mb-6">
        <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-widest">
          Step {step} of {totalSteps}
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <Separator className="mb-6" />

      {/* Step body */}
      {children}
    </div>
  );
}
