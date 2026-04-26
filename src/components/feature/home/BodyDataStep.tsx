'use client';

import { submitBodyDataStep } from '@/app/onboarding/step/[step]/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SegmentedControl } from '@/components/ui/segmented-control';
import type { Profile } from '@/contracts/zod/profile';
import { useState } from 'react';
import { useActionState } from 'react';

type FormState = { ok: true; value: undefined } | { ok: false; error: string };

const ACTIVITY_OPTIONS = [
  { value: 'sedentary' as const, label: 'Sedentary' },
  { value: 'light' as const, label: 'Light' },
  { value: 'moderate' as const, label: 'Moderate' },
  { value: 'active' as const, label: 'Active' },
  { value: 'very_active' as const, label: 'Very active' },
];

const SEX_OPTIONS = [
  { value: 'male' as const, label: 'Male' },
  { value: 'female' as const, label: 'Female' },
];

type ActivityLevelValue = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
type SexValue = 'male' | 'female';

interface BodyDataStepProps {
  profile: Partial<Profile> | null;
}

async function bodyDataStepAdapter(_prev: FormState, formData: FormData): Promise<FormState> {
  const result = await submitBodyDataStep({ ok: true, value: undefined }, formData);
  if (!result.ok) return { ok: false, error: result.error.message };
  return { ok: true, value: undefined };
}

export function BodyDataStep({ profile }: BodyDataStepProps) {
  const initialState: FormState = { ok: true, value: undefined };
  const [state, formAction, pending] = useActionState(bodyDataStepAdapter, initialState);

  const [sex, setSex] = useState<SexValue>(
    (profile?.sex === 'male' || profile?.sex === 'female' ? profile.sex : 'male') as SexValue,
  );
  const [activityLevel, setActivityLevel] = useState<ActivityLevelValue>(
    (profile?.activity_level as ActivityLevelValue) ?? 'moderate',
  );

  return (
    <form action={formAction} className="space-y-5">
      {/* Hidden inputs for controlled fields */}
      <input type="hidden" name="sex" value={sex} />
      <input type="hidden" name="activity_level" value={activityLevel} />

      {/* Height */}
      <div className="space-y-1.5">
        <Label htmlFor="height_cm">Height (cm)</Label>
        <Input
          id="height_cm"
          name="height_cm"
          type="number"
          min={100}
          max={250}
          step={1}
          placeholder="e.g. 175"
          defaultValue={profile?.height_cm ?? ''}
          required
        />
      </div>

      {/* Weight */}
      <div className="space-y-1.5">
        <Label htmlFor="weight_kg">Weight (kg)</Label>
        <Input
          id="weight_kg"
          name="weight_kg"
          type="number"
          min={30}
          max={300}
          step={0.1}
          placeholder="e.g. 72.5"
          defaultValue={profile?.weight_kg ?? ''}
          required
        />
      </div>

      {/* Birthdate */}
      <div className="space-y-1.5">
        <Label htmlFor="birthdate">Date of birth</Label>
        <Input
          id="birthdate"
          name="birthdate"
          type="date"
          defaultValue={profile?.birthdate ?? ''}
          required
        />
      </div>

      {/* Sex */}
      <div className="space-y-1.5">
        <Label>Biological sex</Label>
        <SegmentedControl options={SEX_OPTIONS} value={sex} onChange={(v) => setSex(v)} />
      </div>

      {/* Activity level */}
      <div className="space-y-1.5">
        <Label>Activity level</Label>
        <SegmentedControl
          options={ACTIVITY_OPTIONS}
          value={activityLevel}
          onChange={(v) => setActivityLevel(v)}
          className="flex-wrap"
        />
      </div>

      {!state.ok && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" disabled={pending} className="w-full mt-2">
        {pending ? 'Saving…' : 'Calculate my targets'}
      </Button>
    </form>
  );
}
