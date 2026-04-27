'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { cn } from '@/components/ui/utils';
import type { MacroTargets, Profile } from '@/contracts/zod/profile';
import { computeTargets } from '@/lib/macros';
import { cmToFtIn, ftInToCm, kgToLb, lbToKg } from '@/lib/units';
import { recomputeMacros, updateProfile } from '@/server/profile/actions';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { AllergyChipPicker } from './AllergyChipPicker';
import { MacroTargetsEditor } from './MacroTargetsEditor';

import type { ActivityLevel, DietaryPattern, Goal } from '@/contracts/zod/profile';

const GOAL_OPTIONS: { label: string; value: Goal }[] = [
  { label: 'Cut', value: 'cut' },
  { label: 'Maintain', value: 'maintain' },
  { label: 'Bulk', value: 'bulk' },
];

const DIETARY_PATTERN_OPTIONS: { label: string; value: DietaryPattern; hint: string }[] = [
  { label: 'Omnivore', value: 'omnivore', hint: 'Anything goes' },
  { label: 'Flexitarian', value: 'flexitarian', hint: 'Mostly plants, sometimes meat' },
  { label: 'Pescatarian', value: 'pescatarian', hint: 'Fish + dairy + eggs' },
  { label: 'Vegetarian', value: 'vegetarian', hint: 'No meat or fish' },
  { label: 'Vegan', value: 'vegan', hint: 'No animal products' },
];

const ACTIVITY_OPTIONS: { label: string; value: ActivityLevel }[] = [
  { label: 'Sedentary', value: 'sedentary' },
  { label: 'Light', value: 'light' },
  { label: 'Moderate', value: 'moderate' },
  { label: 'Active', value: 'active' },
  { label: 'Very Active', value: 'very_active' },
];

const ALLERGY_SUGGESTIONS = [
  'gluten',
  'dairy',
  'eggs',
  'nuts',
  'peanuts',
  'shellfish',
  'fish',
  'soy',
  'sesame',
];
const CUISINE_SUGGESTIONS = [
  'Italian',
  'Japanese',
  'Mexican',
  'Indian',
  'Mediterranean',
  'Thai',
  'Chinese',
  'Middle Eastern',
  'American',
  'Korean',
];
const EQUIPMENT_SUGGESTIONS = [
  'air fryer',
  'instant pot',
  'slow cooker',
  'grill',
  'blender',
  'food processor',
  'cast iron',
  'wok',
  'stand mixer',
];

interface ProfileFormProps {
  profile: Profile;
  className?: string;
}

/**
 * Full-page profile edit form with live macro preview.
 * On submit, calls updateProfile() server action and navigates back to /profile.
 */
export function ProfileForm({ profile, className }: ProfileFormProps) {
  const router = useRouter();
  const [draft, setDraft] = React.useState<Profile>(profile);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isRecalculating, setIsRecalculating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // U.S. unit display for height (ft + in) and weight (lbs).
  // Storage is cm/kg — we convert at the UI boundary only.
  const initialHeight = React.useMemo(() => cmToFtIn(profile.height_cm), [profile.height_cm]);
  const [heightFt, setHeightFt] = React.useState<string>(initialHeight.ft);
  const [heightIn, setHeightIn] = React.useState<string>(initialHeight.inch);
  const [weightLb, setWeightLb] = React.useState<string>(kgToLb(profile.weight_kg));

  // Live macro preview derived client-side from biometrics
  const previewTargets = React.useMemo(() => computeTargets(draft) ?? draft.targets, [draft]);

  function patchDraft(fields: Partial<Profile>) {
    setDraft((prev) => ({ ...prev, ...fields }));
  }

  function handleHeightFtChange(value: string) {
    setHeightFt(value);
    patchDraft({ height_cm: ftInToCm(value, heightIn) });
  }

  function handleHeightInChange(value: string) {
    setHeightIn(value);
    patchDraft({ height_cm: ftInToCm(heightFt, value) });
  }

  function handleWeightLbChange(value: string) {
    setWeightLb(value);
    patchDraft({ weight_kg: lbToKg(value) });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await updateProfile({
        display_name: draft.display_name,
        goal: draft.goal,
        targets: draft.targets,
        height_cm: draft.height_cm,
        weight_kg: draft.weight_kg,
        birthdate: draft.birthdate,
        sex: draft.sex,
        activity_level: draft.activity_level,
        dietary_pattern: draft.dietary_pattern,
        allergies: draft.allergies,
        dislikes: draft.dislikes,
        cuisines: draft.cuisines,
        equipment: draft.equipment,
      });
      router.push('/profile');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRecalculate() {
    setIsRecalculating(true);
    try {
      const updated = await recomputeMacros();
      setDraft((prev) => ({ ...prev, targets: updated.targets }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not recalculate targets.');
    } finally {
      setIsRecalculating(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn('flex flex-col gap-8', className)}>
      {/* ── Goal ── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-text">Goal</h2>
        <SegmentedControl
          options={GOAL_OPTIONS}
          value={draft.goal}
          onChange={(goal) => patchDraft({ goal })}
        />
      </section>

      {/* ── Body ── */}
      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-text">Body</h2>

        {/* Height — ft / in */}
        <div className="flex flex-col gap-1.5">
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
                value={heightFt}
                onChange={(e) => handleHeightFtChange(e.target.value)}
                className="font-mono pr-10"
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-text-muted">
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
                value={heightIn}
                onChange={(e) => handleHeightInChange(e.target.value)}
                className="font-mono pr-10"
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-text-muted">
                in
              </span>
            </div>
          </div>
        </div>

        {/* Weight — lbs */}
        <div className="flex flex-col gap-1.5">
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
              value={weightLb}
              onChange={(e) => handleWeightLbChange(e.target.value)}
              className="font-mono pr-12"
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-text-muted">
              lbs
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="birthdate">Date of Birth</Label>
          <Input
            id="birthdate"
            type="date"
            value={draft.birthdate ?? ''}
            onChange={(e) => patchDraft({ birthdate: e.target.value || null })}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Sex</Label>
          <SegmentedControl
            options={[
              { label: 'Male', value: 'male' },
              { label: 'Female', value: 'female' },
              { label: 'Other', value: 'other' },
              { label: 'Prefer not to say', value: 'prefer_not_to_say' },
            ]}
            value={draft.sex ?? 'prefer_not_to_say'}
            onChange={(sex) => patchDraft({ sex })}
            size="sm"
          />
        </div>
      </section>

      {/* ── Activity ── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-text">Activity Level</h2>
        <SegmentedControl
          options={ACTIVITY_OPTIONS}
          value={draft.activity_level ?? 'sedentary'}
          onChange={(activity_level) => patchDraft({ activity_level })}
          size="sm"
        />
      </section>

      {/* ── Macro Targets ── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-text">Macro Targets</h2>
        <p className="text-sm text-text-muted">
          Auto-calculated from your biometrics. Edit manually to override.
        </p>
        <MacroTargetsEditor
          targets={previewTargets}
          onChange={(targets: MacroTargets) => patchDraft({ targets })}
          onRecalculate={handleRecalculate}
          isRecalculating={isRecalculating}
        />
      </section>

      {/* ── Dietary Preferences ── */}
      <section className="flex flex-col gap-5">
        <h2 className="text-base font-semibold text-text">Dietary Preferences</h2>

        <div className="flex flex-col gap-2">
          <Label>Dietary pattern</Label>
          <p className="text-xs text-text-muted">
            We&apos;ll use this to filter proteins and steer flavor — vegetarians get high-protein,
            savory dishes (paneer, tempeh, lentils) instead of generic tofu bowls.
          </p>
          <div className="flex flex-wrap gap-2">
            {DIETARY_PATTERN_OPTIONS.map((opt) => {
              const active = draft.dietary_pattern === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => patchDraft({ dietary_pattern: active ? null : opt.value })}
                  aria-pressed={active}
                  title={opt.hint}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    active
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border text-text-muted hover:border-accent/40 hover:text-text',
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <AllergyChipPicker
          label="Allergies & Intolerances"
          value={draft.allergies}
          onChange={(allergies) => patchDraft({ allergies })}
          suggestions={ALLERGY_SUGGESTIONS}
          placeholder="E.g. gluten, dairy…"
        />
        <AllergyChipPicker
          label="Dislikes"
          value={draft.dislikes}
          onChange={(dislikes) => patchDraft({ dislikes })}
          placeholder="E.g. cilantro, olives…"
        />
        <AllergyChipPicker
          label="Cuisine Preferences"
          value={draft.cuisines}
          onChange={(cuisines) => patchDraft({ cuisines })}
          suggestions={CUISINE_SUGGESTIONS}
          placeholder="E.g. Italian, Japanese…"
        />
        <AllergyChipPicker
          label="Kitchen Equipment"
          value={draft.equipment}
          onChange={(equipment) => patchDraft({ equipment })}
          suggestions={EQUIPMENT_SUGGESTIONS}
          placeholder="E.g. air fryer, wok…"
        />
      </section>

      {/* ── Error ── */}
      {error && (
        <p role="alert" className="rounded-lg bg-err/10 px-3 py-2 text-sm text-err">
          {error}
        </p>
      )}

      {/* ── Actions ── */}
      <div className="flex items-center gap-3 pb-8">
        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            'rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg shadow-1',
            'transition-all duration-snap hover:opacity-90 active:scale-[0.98]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-40',
          )}
        >
          {isSubmitting ? 'Saving…' : 'Save Profile'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/profile')}
          className={cn(
            'rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-text-muted',
            'transition-colors duration-snap hover:text-text',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
