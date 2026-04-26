'use client';
import { Button } from '@/components/ui/button';
import type { HungerLevel, TrainingLevel } from '@/contracts/zod/checkin';
import { useState } from 'react';
import { CheckinForm } from './CheckinForm';

/** Minimal shape needed to display and edit a check-in. */
interface CheckinData {
  id: string;
  date: string;
  energy: number;
  training: TrainingLevel;
  hunger: HungerLevel;
  note: string | null;
}

interface CheckinSummaryProps {
  checkin: CheckinData;
}

const TRAINING_LABELS: Record<string, string> = {
  none: 'Rest day',
  light: 'Light',
  hard: 'Hard',
};

const HUNGER_LABELS: Record<string, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
};

/**
 * Displays today's check-in. Offers an inline "Edit" toggle that swaps
 * the summary for the full CheckinForm pre-populated with existing values.
 */
export function CheckinSummary({ checkin }: CheckinSummaryProps) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <CheckinForm
        date={checkin.date}
        defaultValues={{
          energy: checkin.energy,
          training: checkin.training,
          hunger: checkin.hunger,
          note: checkin.note,
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-text-muted">
        You've already checked in today. Here's what you logged:
      </p>

      <dl className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1 rounded-lg bg-surface-elevated p-3">
          <dt className="text-xs text-text-muted uppercase tracking-wide">Energy</dt>
          <dd className="font-mono text-2xl font-semibold text-text">
            {checkin.energy}
            <span className="text-sm font-normal text-text-muted">/5</span>
          </dd>
        </div>
        <div className="flex flex-col gap-1 rounded-lg bg-surface-elevated p-3">
          <dt className="text-xs text-text-muted uppercase tracking-wide">Training</dt>
          <dd className="text-sm font-medium text-text">
            {TRAINING_LABELS[checkin.training] ?? checkin.training}
          </dd>
        </div>
        <div className="flex flex-col gap-1 rounded-lg bg-surface-elevated p-3">
          <dt className="text-xs text-text-muted uppercase tracking-wide">Hunger</dt>
          <dd className="text-sm font-medium text-text">
            {HUNGER_LABELS[checkin.hunger] ?? checkin.hunger}
          </dd>
        </div>
      </dl>

      {checkin.note && <p className="text-sm text-text-muted italic">"{checkin.note}"</p>}

      <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="self-start">
        Edit check-in
      </Button>
    </div>
  );
}
