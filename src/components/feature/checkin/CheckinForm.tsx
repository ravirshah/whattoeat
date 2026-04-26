'use client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SegmentedControl } from '@/components/ui/segmented-control';
import type { HungerLevel, TrainingLevel } from '@/contracts/zod/checkin';
import { saveCheckin } from '@/server/checkin/actions';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { EnergySlider } from './EnergySlider';

interface CheckinFormProps {
  /** Pre-populate fields if editing an existing check-in. */
  defaultValues?: {
    energy: number;
    training: TrainingLevel;
    hunger: HungerLevel;
    note?: string | null;
  };
  /** ISO date string (YYYY-MM-DD) for the check-in. Defaults to today (UTC). */
  date: string;
}

// Training options matching the frozen TrainingLevel enum: none | light | hard
const TRAINING_OPTIONS: { label: string; value: TrainingLevel }[] = [
  { label: 'Rest', value: 'none' },
  { label: 'Light', value: 'light' },
  { label: 'Hard', value: 'hard' },
];

const HUNGER_OPTIONS: { label: string; value: HungerLevel }[] = [
  { label: 'Low', value: 'low' },
  { label: 'Normal', value: 'normal' },
  { label: 'High', value: 'high' },
];

/**
 * Daily check-in form. Client Component - manages local state and calls
 * the `saveCheckin` server action on submit.
 */
export function CheckinForm({ defaultValues, date }: CheckinFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [energy, setEnergy] = useState<number>(defaultValues?.energy ?? 3);
  const [training, setTraining] = useState<TrainingLevel>(defaultValues?.training ?? 'none');
  const [hunger, setHunger] = useState<HungerLevel>(defaultValues?.hunger ?? 'normal');
  const [note, setNote] = useState<string>(defaultValues?.note ?? '');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await saveCheckin({ date, energy, training, hunger, note: note.trim() || null });
        router.push('/feed-me');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Energy */}
      <div className="flex flex-col gap-3">
        <Label htmlFor="energy-group">Energy today</Label>
        <EnergySlider value={energy} onChange={setEnergy} />
      </div>

      {/* Training */}
      <div className="flex flex-col gap-3">
        <Label>Training</Label>
        <SegmentedControl
          options={TRAINING_OPTIONS}
          value={training}
          onChange={setTraining}
          className="w-full"
        />
      </div>

      {/* Hunger */}
      <div className="flex flex-col gap-3">
        <Label>Hunger</Label>
        <SegmentedControl
          options={HUNGER_OPTIONS}
          value={hunger}
          onChange={setHunger}
          className="w-full"
        />
      </div>

      {/* Optional note */}
      <div className="flex flex-col gap-3">
        <Label htmlFor="checkin-note">
          Note <span className="text-text-muted font-normal">(optional)</span>
        </Label>
        <textarea
          id="checkin-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Anything else on your mind?"
          className={[
            'flex w-full rounded-lg border border-border bg-surface-elevated px-3 py-2',
            'text-sm text-text placeholder:text-text-placeholder resize-none',
            'transition-colors duration-snap',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent',
            'disabled:cursor-not-allowed disabled:opacity-40',
          ].join(' ')}
        />
      </div>

      {/* Error state */}
      {error && (
        <p role="alert" className="text-sm text-err">
          {error}
        </p>
      )}

      {/* Submit */}
      <Button type="submit" size="lg" disabled={isPending} className="w-full">
        {isPending ? 'Saving...' : 'Save & continue'}
      </Button>
    </form>
  );
}
