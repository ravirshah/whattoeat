import type { Profile } from '@/contracts/zod/profile';

interface HomeMacroRingProps {
  profile: Partial<Profile> | null;
}

/**
 * DailyTargets — read-only macro target display.
 *
 * Shows the user's computed kcal/protein/carbs/fat targets as a clean stat row.
 * Macro intake tracking is not yet implemented in the check-in; showing ring
 * fill values at 75% would be misleading, so this component is intentionally
 * targets-only until a food-log feature ships.
 */
export function HomeMacroRing({ profile }: HomeMacroRingProps) {
  const kcal = profile?.targets?.kcal ?? null;
  const protein = profile?.targets?.protein_g ?? null;
  const carbs = profile?.targets?.carbs_g ?? null;
  const fat = profile?.targets?.fat_g ?? null;

  const stats = [
    { label: 'Protein', value: protein, unit: 'g', color: 'text-cat-protein' },
    { label: 'Carbs', value: carbs, unit: 'g', color: 'text-cat-grain' },
    { label: 'Fat', value: fat, unit: 'g', color: 'text-cat-pantry' },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* kcal target — primary number */}
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold tabular-nums text-foreground">
          {kcal != null ? kcal.toLocaleString() : '—'}
        </span>
        <span className="text-sm text-muted-foreground">kcal / day</span>
      </div>

      {/* Macro targets row */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map(({ label, value, unit, color }) => (
          <div key={label} className="flex flex-col gap-0.5">
            <span className={`text-base font-semibold tabular-nums ${color}`}>
              {value != null ? `${value}${unit}` : '—'}
            </span>
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
