'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/components/ui/utils';
import type { HealthExtraction, HealthMarker, HealthSuggested } from '@/contracts/zod/health';
import {
  applyHealthExtraction,
  discardHealthExtraction,
} from '@/server/profile/apply-health-extraction';
import { extractHealthDoc } from '@/server/profile/extract-health-doc';
import { useState, useTransition } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Phase = 'input' | 'preview' | 'edit' | 'done';

interface ExtractionResult extends HealthExtraction {
  id: string;
}

interface HealthDocStepProps {
  /** Called when user applies or explicitly discards. */
  onApplied?: () => void;
  /** Called when user clicks Skip. */
  onSkip?: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DOC_TYPE_LABEL: Record<string, string> = {
  bloodwork: 'Bloodwork / labs',
  body_composition: 'Body composition scan',
  fitness_tracker: 'Fitness tracker export',
  training_plan: 'Training / coaching plan',
  unknown: 'Health document',
};

function MarkerTable({ markers }: { markers: HealthMarker[] }) {
  if (markers.length === 0) return null;
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface-elevated text-muted-foreground text-xs uppercase tracking-wide">
            <th className="text-left px-3 py-2 font-medium">Marker</th>
            <th className="text-right px-3 py-2 font-medium">Value</th>
          </tr>
        </thead>
        <tbody>
          {markers.map((m, i) => (
            <tr
              key={`${m.name}-${i}`}
              className="border-t border-border even:bg-surface-elevated/30"
            >
              <td className="px-3 py-2 text-foreground">{m.name}</td>
              <td className="px-3 py-2 text-right text-foreground tabular-nums">
                {String(m.value)}
                {m.unit ? (
                  <span className="text-muted-foreground ml-1 text-xs">{m.unit}</span>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SuggestionChips({ suggested }: { suggested: HealthSuggested }) {
  const chips: string[] = [];
  if (suggested.goal) chips.push(`Goal: ${suggested.goal}`);
  if (suggested.activity_level)
    chips.push(`Activity: ${suggested.activity_level.replace('_', ' ')}`);
  if (suggested.targets?.kcal) chips.push(`${suggested.targets.kcal} kcal/day`);
  if (suggested.targets?.protein_g) chips.push(`${suggested.targets.protein_g}g protein`);
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <span
          key={c}
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent border border-accent/20"
        >
          {c}
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Input phase — paste area
// ---------------------------------------------------------------------------

function InputPhase({
  onExtract,
  onSkip,
}: {
  onExtract: (text: string) => void;
  onSkip: () => void;
}) {
  const [text, setText] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(() => {
      onExtract(text);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="health-doc-text">Paste your document</Label>
        <textarea
          id="health-doc-text"
          className={cn(
            'w-full min-h-[180px] resize-y rounded-xl border border-border bg-background',
            'px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring transition-shadow',
          )}
          placeholder="Paste your latest labs, body composition scan, fitness tracker export, or training plan."
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={8000}
        />
        <p className="text-xs text-muted-foreground text-right">
          {text.length.toLocaleString()} / 8,000
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={!text.trim() || isPending} className="flex-1">
          {isPending ? 'Reading…' : 'Read document'}
        </Button>
        <Button type="button" variant="ghost" onClick={onSkip} disabled={isPending}>
          Skip
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Preview phase — show extraction + apply / edit / discard
// ---------------------------------------------------------------------------

function PreviewPhase({
  extraction,
  onApply,
  onEdit,
  onDiscard,
}: {
  extraction: ExtractionResult;
  onApply: () => void;
  onEdit: () => void;
  onDiscard: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleApply() {
    setError(null);
    startTransition(() => {
      onApply();
    });
  }

  function handleDiscard() {
    startTransition(() => {
      onDiscard();
    });
  }

  const hasAnySuggestions =
    extraction.suggested.goal ||
    extraction.suggested.activity_level ||
    (extraction.suggested.targets && Object.keys(extraction.suggested.targets).length > 0);

  return (
    <div className="space-y-5">
      {/* Doc type badge */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-surface-elevated text-muted-foreground border border-border">
          {DOC_TYPE_LABEL[extraction.docType] ?? 'Document'}
        </span>
      </div>

      {/* Summary */}
      <p className="text-sm text-foreground leading-relaxed">{extraction.summary}</p>

      {/* Markers */}
      {extraction.markers.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            What I read
          </p>
          <MarkerTable markers={extraction.markers} />
        </div>
      )}

      {/* Suggestions */}
      {hasAnySuggestions && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Suggested adjustments
          </p>
          <SuggestionChips suggested={extraction.suggested} />
        </div>
      )}

      {/* Notes from AI */}
      {extraction.suggested.notes && extraction.suggested.notes.length > 0 && (
        <ul className="space-y-1.5 pl-4 list-disc text-sm text-muted-foreground">
          {extraction.suggested.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2 pt-1">
        {hasAnySuggestions && (
          <Button onClick={handleApply} disabled={isPending} className="flex-1">
            {isPending ? 'Applying…' : 'Apply'}
          </Button>
        )}
        <Button variant="outline" onClick={onEdit} disabled={isPending}>
          Edit
        </Button>
        <Button variant="ghost" onClick={handleDiscard} disabled={isPending}>
          Discard
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit phase — inline form to tweak suggestions before applying
// ---------------------------------------------------------------------------

const ACTIVITY_OPTIONS = [
  { value: 'sedentary', label: 'Sedentary' },
  { value: 'light', label: 'Light' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'active', label: 'Active' },
  { value: 'very_active', label: 'Very active' },
] as const;

const GOAL_OPTIONS = [
  { value: 'cut', label: 'Lose weight' },
  { value: 'maintain', label: 'Stay balanced' },
  { value: 'bulk', label: 'Build muscle' },
] as const;

function EditPhase({
  extraction,
  onConfirm,
  onCancel,
}: {
  extraction: ExtractionResult;
  onConfirm: (overrides: HealthSuggested) => void;
  onCancel: () => void;
}) {
  const [goal, setGoal] = useState<string>(extraction.suggested.goal ?? '');
  const [activityLevel, setActivityLevel] = useState<string>(
    extraction.suggested.activity_level ?? '',
  );
  const [kcal, setKcal] = useState<string>(
    extraction.suggested.targets?.kcal ? String(extraction.suggested.targets.kcal) : '',
  );
  const [proteinG, setProteinG] = useState<string>(
    extraction.suggested.targets?.protein_g ? String(extraction.suggested.targets.protein_g) : '',
  );

  function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    const overrides: HealthSuggested = {};
    if (goal) overrides.goal = goal as HealthSuggested['goal'];
    if (activityLevel)
      overrides.activity_level = activityLevel as HealthSuggested['activity_level'];

    const kcalNum = Number.parseInt(kcal, 10);
    const proteinNum = Number.parseInt(proteinG, 10);
    if (kcalNum > 0 || proteinNum > 0) {
      overrides.targets = {
        ...(kcalNum > 0 && { kcal: kcalNum }),
        ...(proteinNum > 0 && { protein_g: proteinNum }),
      };
    }

    onConfirm(overrides);
  }

  return (
    <form onSubmit={handleConfirm} className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Adjust any field before applying. Leave blank to skip that field.
      </p>

      {/* Goal */}
      <div className="space-y-1.5">
        <Label htmlFor="edit-goal">Goal</Label>
        <select
          id="edit-goal"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          className={cn(
            'w-full rounded-xl border border-border bg-background px-3 py-2',
            'text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring',
          )}
        >
          <option value="">No change</option>
          {GOAL_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Activity level */}
      <div className="space-y-1.5">
        <Label htmlFor="edit-activity">Activity level</Label>
        <select
          id="edit-activity"
          value={activityLevel}
          onChange={(e) => setActivityLevel(e.target.value)}
          className={cn(
            'w-full rounded-xl border border-border bg-background px-3 py-2',
            'text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring',
          )}
        >
          <option value="">No change</option>
          {ACTIVITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Targets */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="edit-kcal">Calories (kcal)</Label>
          <input
            id="edit-kcal"
            type="number"
            inputMode="numeric"
            min={800}
            max={10000}
            value={kcal}
            onChange={(e) => setKcal(e.target.value)}
            placeholder="e.g. 2100"
            className={cn(
              'w-full rounded-xl border border-border bg-background px-3 py-2',
              'text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring',
            )}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-protein">Protein (g)</Label>
          <input
            id="edit-protein"
            type="number"
            inputMode="numeric"
            min={10}
            max={500}
            value={proteinG}
            onChange={(e) => setProteinG(e.target.value)}
            placeholder="e.g. 160"
            className={cn(
              'w-full rounded-xl border border-border bg-background px-3 py-2',
              'text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring',
            )}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" className="flex-1">
          Apply edits
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Back
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Main HealthDocStep orchestrator
// ---------------------------------------------------------------------------

export function HealthDocStep({ onApplied, onSkip }: HealthDocStepProps) {
  const [phase, setPhase] = useState<Phase>('input');
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExtract(text: string) {
    setError(null);
    const result = await extractHealthDoc({ text });
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setExtraction(result.value);
    setPhase('preview');
  }

  async function handleApply() {
    if (!extraction) return;
    const result = await applyHealthExtraction(extraction.id);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setPhase('done');
    onApplied?.();
  }

  async function handleDiscard() {
    if (!extraction) return;
    await discardHealthExtraction(extraction.id);
    onSkip?.();
  }

  async function handleEditConfirm(overrides: HealthSuggested) {
    if (!extraction) return;
    // Merge overrides into the extraction in memory, then go back to preview.
    setExtraction((prev) =>
      prev
        ? {
            ...prev,
            suggested: { ...prev.suggested, ...overrides },
          }
        : prev,
    );
    setPhase('preview');
  }

  if (phase === 'done') {
    return (
      <p className="text-sm text-foreground">Suggestions applied. Your profile has been updated.</p>
    );
  }

  return (
    <div className="space-y-2">
      {error && phase === 'input' && <p className="text-sm text-destructive mb-2">{error}</p>}

      {phase === 'input' && <InputPhase onExtract={handleExtract} onSkip={() => onSkip?.()} />}

      {phase === 'preview' && extraction && (
        <PreviewPhase
          extraction={extraction}
          onApply={handleApply}
          onEdit={() => setPhase('edit')}
          onDiscard={handleDiscard}
        />
      )}

      {phase === 'edit' && extraction && (
        <EditPhase
          extraction={extraction}
          onConfirm={handleEditConfirm}
          onCancel={() => setPhase('preview')}
        />
      )}
    </div>
  );
}
