'use client';

import { submitGoalStep } from '@/app/onboarding/step/[step]/actions';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/utils';
import type { Profile } from '@/contracts/zod/profile';
import { useState } from 'react';
import { useActionState } from 'react';

type FormState = { ok: true; value: undefined } | { ok: false; error: string };

const GOALS = [
  {
    value: 'cut' as const,
    label: 'Lose weight',
    emoji: '🔥',
    description: 'Create a calorie deficit to shed fat while preserving muscle.',
  },
  {
    value: 'maintain' as const,
    label: 'Stay balanced',
    emoji: '⚖️',
    description: 'Eat at maintenance and feel consistently energized.',
  },
  {
    value: 'bulk' as const,
    label: 'Build muscle',
    emoji: '💪',
    description: 'Eat at a surplus to fuel strength and muscle growth.',
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
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="goal" value={selected} />

      <div className="grid grid-cols-1 gap-3">
        {GOALS.map((g) => (
          <button
            key={g.value}
            type="button"
            onClick={() => setSelected(g.value)}
            className={cn(
              'w-full text-left rounded-xl border-2 px-4 py-3.5 transition-all duration-150',
              'flex items-start gap-3 cursor-pointer',
              selected === g.value
                ? 'border-accent bg-accent/5'
                : 'border-border bg-card hover:border-accent/50',
            )}
          >
            <span className="text-2xl leading-none mt-0.5">{g.emoji}</span>
            <div>
              <p className="font-semibold text-foreground text-sm">{g.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{g.description}</p>
            </div>
          </button>
        ))}
      </div>

      {!state.ok && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={!selected || pending} className="w-full mt-6">
        {pending ? 'Saving…' : 'Continue'}
      </Button>
    </form>
  );
}
