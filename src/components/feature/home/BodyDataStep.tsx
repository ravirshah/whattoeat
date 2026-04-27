'use client';

import { submitBodyDataStep } from '@/app/onboarding/step/[step]/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SegmentedControl } from '@/components/ui/segmented-control';
import type { Profile } from '@/contracts/zod/profile';
import { cmToFtIn, kgToLb } from '@/lib/units';
import { useMemo, useState } from 'react';
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
  { value: 'prefer_not_to_say' as const, label: 'Prefer not to say' },
];

type ActivityLevelValue = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
type SexValue = 'male' | 'female' | 'prefer_not_to_say';

async function bodyDataStepAdapter(_prev: FormState, formData: FormData): Promise<FormState> {
  const result = await submitBodyDataStep({ ok: true, value: undefined }, formData);
  if (!result.ok) return { ok: false, error: result.error.message };
  return { ok: true, value: undefined };
}

interface BodyDataStepProps {
  profile: Partial<Profile> | null;
}

export function BodyDataStep({ profile }: BodyDataStepProps) {
  const initialState: FormState = { ok: true, value: undefined };
  const [state, formAction, pending] = useActionState(bodyDataStepAdapter, initialState);

  const initial = useMemo(
    () => ({
      ...cmToFtIn(profile?.height_cm),
      lb: kgToLb(profile?.weight_kg),
    }),
    [profile?.height_cm, profile?.weight_kg],
  );

  const [ft, setFt] = useState<string>(initial.ft);
  const [inch, setInch] = useState<string>(initial.inch);
  const [lb, setLb] = useState<string>(initial.lb);
  const [sex, setSex] = useState<SexValue>(
    (profile?.sex === 'male' || profile?.sex === 'female' || profile?.sex === 'prefer_not_to_say'
      ? profile.sex
      : 'male') as SexValue,
  );
  const [activityLevel, setActivityLevel] = useState<ActivityLevelValue>(
    (profile?.activity_level as ActivityLevelValue) ?? 'moderate',
  );

  // Convert UI-units to server-units. The server contract still expects
  // height_cm and weight_kg, so we compute and ship those via hidden inputs.
  const height_cm = useMemo(() => {
    const f = Number.parseFloat(ft || '0');
    const i = Number.parseFloat(inch || '0');
    if (Number.isNaN(f) || Number.isNaN(i)) return '';
    const cm = (f * 12 + i) * 2.54;
    return cm > 0 ? cm.toFixed(1) : '';
  }, [ft, inch]);

  const weight_kg = useMemo(() => {
    const lbs = Number.parseFloat(lb || '0');
    if (Number.isNaN(lbs)) return '';
    const kg = lbs / 2.2046226218;
    return kg > 0 ? kg.toFixed(2) : '';
  }, [lb]);

  // Sensible default DOB anchor: 30 years ago — keeps the native picker
  // from opening on the current month and forcing 30+ taps back.
  const dobDefault = useMemo(() => {
    if (profile?.birthdate) return profile.birthdate;
    const d = new Date();
    d.setFullYear(d.getFullYear() - 30);
    return d.toISOString().slice(0, 10);
  }, [profile?.birthdate]);

  return (
    <form action={formAction} className="space-y-6">
      {/* Hidden inputs for server contract */}
      <input type="hidden" name="height_cm" value={height_cm} />
      <input type="hidden" name="weight_kg" value={weight_kg} />
      <input type="hidden" name="sex" value={sex} />
      <input type="hidden" name="activity_level" value={activityLevel} />

      {/* Height — ft / in */}
      <div className="space-y-1.5">
        <Label htmlFor="height_ft">Height</Label>
        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <Input
              id="height_ft"
              type="number"
              inputMode="numeric"
              min={3}
              max={8}
              step={1}
              placeholder="5"
              value={ft}
              onChange={(e) => setFt(e.target.value)}
              required
              className="pr-10"
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
              ft
            </span>
          </div>
          <div className="relative">
            <Input
              id="height_in"
              type="number"
              inputMode="numeric"
              min={0}
              max={11}
              step={1}
              placeholder="10"
              value={inch}
              onChange={(e) => setInch(e.target.value)}
              required
              className="pr-10"
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
              in
            </span>
          </div>
        </div>
      </div>

      {/* Weight — lbs */}
      <div className="space-y-1.5">
        <Label htmlFor="weight_lb">Weight</Label>
        <div className="relative">
          <Input
            id="weight_lb"
            type="number"
            inputMode="decimal"
            min={60}
            max={660}
            step={0.1}
            placeholder="160"
            value={lb}
            onChange={(e) => setLb(e.target.value)}
            required
            className="pr-12"
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
            lbs
          </span>
        </div>
      </div>

      {/* Birthdate — native picker */}
      <div className="space-y-1.5">
        <Label htmlFor="birthdate">Date of birth</Label>
        <Input
          id="birthdate"
          name="birthdate"
          type="date"
          defaultValue={dobDefault}
          max={new Date().toISOString().slice(0, 10)}
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
