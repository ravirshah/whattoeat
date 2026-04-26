'use client';

import { submitGoalStep } from '@/app/onboarding/step/[step]/actions';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/utils';
import type { Profile } from '@/contracts/zod/profile';
import { CheckIcon, FlameIcon, ScaleIcon, TrendingUpIcon } from 'lucide-react';
import { useState } from 'react';
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
  const [selected, setSelected] = useState<string>(profile?.goal ?? '');

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="goal" value={selected} />

      <fieldset className="contents">
        <legend className="sr-only">Goal</legend>
        <div className="grid grid-cols-1 gap-2.5">
          {GOALS.map(({ value, label, description, Icon }) => {
            const active = selected === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                onClick={() => setSelected(value)}
                className={cn(
                  'group relative w-full text-left rounded-2xl border bg-card px-4 py-4',
                  'flex items-center gap-4 transition-all duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active
                    ? 'border-accent shadow-[0_0_0_1px_rgb(var(--accent))] bg-accent/[0.04]'
                    : 'border-border hover:border-accent/40 hover:bg-surface-elevated',
                )}
              >
                <div
                  className={cn(
                    'flex-none h-10 w-10 rounded-xl flex items-center justify-center transition-colors',
                    active
                      ? 'bg-accent/10 text-accent'
                      : 'bg-surface-elevated text-muted-foreground group-hover:text-foreground',
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
                    active ? 'border-accent bg-accent' : 'border-border',
                  )}
                >
                  {active && (
                    <CheckIcon className="h-3 w-3 text-accent-foreground" strokeWidth={3} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </fieldset>

      {!state.ok && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={!selected || pending} className="w-full">
        {pending ? 'Saving…' : 'Continue'}
      </Button>
    </form>
  );
}
