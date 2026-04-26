'use client';

import { submitAllergensStep } from '@/app/onboarding/step/[step]/actions';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/utils';
import type { Profile } from '@/contracts/zod/profile';
import { useState } from 'react';
import { useActionState } from 'react';

type FormState = { ok: true; value: undefined } | { ok: false; error: string };

const COMMON_ALLERGENS = [
  { value: 'gluten', label: 'Gluten' },
  { value: 'dairy', label: 'Dairy' },
  { value: 'eggs', label: 'Eggs' },
  { value: 'fish', label: 'Fish' },
  { value: 'shellfish', label: 'Shellfish' },
  { value: 'tree_nuts', label: 'Tree Nuts' },
  { value: 'peanuts', label: 'Peanuts' },
  { value: 'soy', label: 'Soy' },
  { value: 'sesame', label: 'Sesame' },
  { value: 'wheat', label: 'Wheat' },
  { value: 'sulfites', label: 'Sulfites' },
] as const;

interface AllergensStepProps {
  profile: Partial<Profile> | null;
}

async function allergensStepAdapter(_prev: FormState, formData: FormData): Promise<FormState> {
  const result = await submitAllergensStep({ ok: true, value: undefined }, formData);
  if (!result.ok) return { ok: false, error: result.error.message };
  return { ok: true, value: undefined };
}

export function AllergensStep({ profile }: AllergensStepProps) {
  const initialState: FormState = { ok: true, value: undefined };
  const [state, formAction, pending] = useActionState(allergensStepAdapter, initialState);

  const initialSelected = new Set<string>(
    Array.isArray(profile?.allergies) ? (profile.allergies as string[]) : [],
  );
  const [selected, setSelected] = useState<Set<string>>(initialSelected);

  const toggle = (value: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  };

  return (
    <form action={formAction} className="space-y-5">
      <p className="text-sm text-muted-foreground">
        We will never suggest a meal that contains an ingredient you flag here. You can add more in
        Profile settings at any time.
      </p>

      {/* Hidden inputs for each selected allergen */}
      {Array.from(selected).map((a) => (
        <input key={a} type="hidden" name="allergens" value={a} />
      ))}

      {/* Chip grid */}
      <div className="flex flex-wrap gap-2">
        {COMMON_ALLERGENS.map((a) => (
          <button
            key={a.value}
            type="button"
            onClick={() => toggle(a.value)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors duration-150',
              selected.has(a.value)
                ? 'border-destructive bg-destructive/10 text-destructive'
                : 'border-border bg-card text-foreground hover:border-border/70',
            )}
          >
            {a.label}
          </button>
        ))}
      </div>

      {!state.ok && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex gap-3 mt-6">
        <Button
          type="submit"
          variant="outline"
          className="flex-1"
          disabled={pending}
          onClick={() => setSelected(new Set())}
        >
          I have none
        </Button>
        <Button type="submit" className="flex-1" disabled={pending}>
          {pending ? 'Saving…' : selected.size > 0 ? `Flag ${selected.size}` : 'Continue'}
        </Button>
      </div>
    </form>
  );
}
