'use client';
import { submitConfirmTargetsStep } from '@/app/onboarding/step/[step]/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Profile } from '@/contracts/zod/profile';
import { computeTargets } from '@/lib/macros';
import { useActionState } from 'react';

type FormState = { ok: true; value: undefined } | { ok: false; error: string };

interface ConfirmTargetsStepProps {
  profile: Partial<Profile> | null;
}

async function confirmTargetsAdapter(_prev: FormState, formData: FormData): Promise<FormState> {
  const result = await submitConfirmTargetsStep({ ok: true, value: undefined }, formData);
  if (!result.ok) return { ok: false, error: result.error.message };
  return { ok: true, value: undefined };
}

export function ConfirmTargetsStep({ profile }: ConfirmTargetsStepProps) {
  const initialState: FormState = { ok: true, value: undefined };
  const [state, formAction, pending] = useActionState(confirmTargetsAdapter, initialState);

  const suggested =
    profile?.height_cm && profile.weight_kg && profile.birthdate
      ? computeTargets(profile as Parameters<typeof computeTargets>[0])
      : null;

  const defaults = {
    target_kcal:
      profile?.targets?.kcal && profile.targets.kcal > 0
        ? profile.targets.kcal
        : (suggested?.kcal ?? 2000),
    target_protein_g: profile?.targets?.protein_g ?? suggested?.protein_g ?? 150,
    target_carbs_g: profile?.targets?.carbs_g ?? suggested?.carbs_g ?? 200,
    target_fat_g: profile?.targets?.fat_g ?? suggested?.fat_g ?? 65,
  };

  return (
    <form action={formAction} className="space-y-5">
      <div className="rounded-xl bg-muted/50 border border-border px-4 py-3 text-sm text-muted-foreground">
        These are your suggested targets based on your body data and goal. You can adjust them below
        — or leave them as-is and refine later in Profile settings.
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="target_kcal">Daily calories (kcal)</Label>
        <Input
          id="target_kcal"
          name="target_kcal"
          type="number"
          min={800}
          max={10000}
          step={50}
          defaultValue={defaults.target_kcal}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="target_protein_g">Protein (g)</Label>
        <Input
          id="target_protein_g"
          name="target_protein_g"
          type="number"
          min={10}
          max={500}
          step={5}
          defaultValue={defaults.target_protein_g}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="target_carbs_g">Carbohydrates (g)</Label>
        <Input
          id="target_carbs_g"
          name="target_carbs_g"
          type="number"
          min={0}
          max={800}
          step={5}
          defaultValue={defaults.target_carbs_g}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="target_fat_g">Fat (g)</Label>
        <Input
          id="target_fat_g"
          name="target_fat_g"
          type="number"
          min={10}
          max={500}
          step={5}
          defaultValue={defaults.target_fat_g}
          required
        />
      </div>

      {!state.ok && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending} className="w-full mt-2">
        {pending ? 'Saving…' : 'These look right'}
      </Button>
    </form>
  );
}
