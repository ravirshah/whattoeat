'use client';

import { submitGoalStep } from '@/app/onboarding/step/[step]/actions';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/utils';
import type { Profile } from '@/contracts/zod/profile';
import { CheckIcon, FlameIcon, ScaleIcon, TrendingUpIcon } from 'lucide-react';
import { useActionState } from 'react';

type FormState = { ok: true; value: undefined } | { ok: false; error: string };

const GOALS = [
  {
    value: 'cut' as const,
    label: 'Lose weight',
    description: 'Calorie deficit, preserve muscle.',
    Icon: FlameIcon,
  },
  {
    value: 'maintain' as const,
    label: 'Stay balanced',
    description: 'Eat at maintenance, feel steady.',
    Icon: ScaleIcon,
  },
  {
    value: 'bulk' as const,
    label: 'Build muscle',
    description: 'Slight surplus, fuel strength.',
    Icon: TrendingUpIcon,
  },
] as const;

interface GoalStepProps {
  profile: Partial<Profile> | null;
}

async function goalStepAdapter(_prev: FormState, formData: FormData): Promise<FormState> {
  const result = await submitGoalStep({ ok: true, value: undefined }, formData);
  if (!result.ok) return { ok: false, error: result.error.message };
  return { ok: true, value: undefined };
}

export function GoalStep({ profile }: GoalStepProps) {
  const initialState: FormState = { ok: true, value: undefined };
  const [state, formAction, pending] = useActionState(goalStepAdapter, initialState);
  const defaultGoal = profile?.goal ?? '';

  return (
    <form action={formAction} className="space-y-6">
      <fieldset className="contents">
        <legend className="sr-only">Goal</legend>
        <div className="grid grid-cols-1 gap-2.5">
          {GOALS.map(({ value, label, description, Icon }) => (
            <label
              key={value}
              className={cn(
                'group relative w-full cursor-pointer rounded-2xl border bg-card px-4 py-4',
                'flex items-center gap-4 transition-all duration-150',
                'has-[:checked]:border-accent has-[:checked]:shadow-[0_0_0_1px_rgb(var(--accent))] has-[:checked]:bg-accent/[0.04]',
                'hover:border-accent/40 hover:bg-surface-elevated',
              )}
            >
              {/* Visually hidden native radio */}
              <input
                type="radio"
                name="goal"
                value={value}
                defaultChecked={defaultGoal === value}
                className="sr-only"
              />

              <div
                className={cn(
                  'flex-none h-10 w-10 rounded-xl flex items-center justify-center transition-colors',
                  'bg-surface-elevated text-muted-foreground group-has-[:checked]:bg-accent/10 group-has-[:checked]:text-accent',
                  'group-hover:text-foreground',
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={2} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-[15px] leading-tight">{label}</p>
                <p className="text-[13px] text-muted-foreground mt-0.5 leading-snug">
                  {description}
                </p>
              </div>

              <div
                className={cn(
                  'flex-none h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all',
                  'border-border group-has-[:checked]:border-accent group-has-[:checked]:bg-accent',
                )}
              >
                <CheckIcon
                  className="h-3 w-3 text-accent-foreground opacity-0 group-has-[:checked]:opacity-100 transition-opacity"
                  strokeWidth={3}
                />
              </div>
            </label>
          ))}
        </div>
      </fieldset>

      {!state.ok && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Saving…' : 'Continue'}
      </Button>
    </form>
  );
}
