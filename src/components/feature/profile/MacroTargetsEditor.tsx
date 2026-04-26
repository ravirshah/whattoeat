'use client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatTile } from '@/components/ui/stat-tile';
import { cn } from '@/components/ui/utils';
import type { MacroTargets } from '@/contracts/zod/profile';

interface MacroTargetsEditorProps {
  targets: MacroTargets;
  onChange: (next: MacroTargets) => void;
  onRecalculate?: () => Promise<void>;
  isRecalculating?: boolean;
  className?: string;
}

/**
 * MacroTargetsEditor — four numeric inputs for kcal/protein/carbs/fat with
 * live calorie balance display and a "Recalculate from biometrics" button.
 */
export function MacroTargetsEditor({
  targets,
  onChange,
  onRecalculate,
  isRecalculating = false,
  className,
}: MacroTargetsEditorProps) {
  function patch(field: keyof MacroTargets, raw: string) {
    const val = Number.parseInt(raw, 10);
    if (Number.isNaN(val) || val < 0) return;
    onChange({ ...targets, [field]: val });
  }

  // Calorie balance from macros (for informational display only)
  const calculatedKcal = targets.protein_g * 4 + targets.carbs_g * 4 + targets.fat_g * 9;
  const delta = targets.kcal - calculatedKcal;

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* At-a-glance tiles */}
      <div className="grid grid-cols-4 gap-2">
        <StatTile label="kcal" value={targets.kcal} tone="warm" />
        <StatTile label="protein" value={targets.protein_g} unit="g" />
        <StatTile label="carbs" value={targets.carbs_g} unit="g" />
        <StatTile label="fat" value={targets.fat_g} unit="g" />
      </div>

      {/* Editable fields */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            { key: 'kcal', label: 'Calories (kcal)' },
            { key: 'protein_g', label: 'Protein (g)' },
            { key: 'carbs_g', label: 'Carbs (g)' },
            { key: 'fat_g', label: 'Fat (g)' },
          ] as { key: keyof MacroTargets; label: string }[]
        ).map(({ key, label }) => (
          <div key={key} className="flex flex-col gap-1">
            <Label htmlFor={`macro-${key}`}>{label}</Label>
            <Input
              id={`macro-${key}`}
              type="number"
              min={0}
              value={targets[key]}
              onChange={(e) => patch(key, e.target.value)}
              className="font-mono"
            />
          </div>
        ))}
      </div>

      {/* Balance indicator */}
      {Math.abs(delta) > 5 && (
        <p className="text-xs text-text-muted">
          Macro math totals{' '}
          <span className="font-mono font-semibold text-text">{calculatedKcal}</span> kcal —{' '}
          {delta > 0
            ? `${delta} kcal below macro total`
            : `${Math.abs(delta)} kcal above macro total`}
          . Adjust to align.
        </p>
      )}

      {/* Recalculate button */}
      {onRecalculate && (
        <button
          type="button"
          onClick={onRecalculate}
          disabled={isRecalculating}
          className={cn(
            'self-start rounded-lg border border-border px-3 py-1.5 text-sm font-medium',
            'text-text-muted transition-colors duration-snap',
            'hover:border-accent/60 hover:text-text',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-40',
          )}
        >
          {isRecalculating ? 'Recalculating…' : '↺ Recalculate from biometrics'}
        </button>
      )}
    </div>
  );
}
