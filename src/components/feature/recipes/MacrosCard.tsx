import { MacroRing } from '@/components/ui/macro-ring';
import { StatTile } from '@/components/ui/stat-tile';
import type { Macros } from '@/contracts/zod/recipe';

interface MacrosCardProps {
  macros: Macros;
  targetKcal?: number;
  className?: string;
}

export function MacrosCard({ macros, targetKcal, className }: MacrosCardProps) {
  const target = {
    kcal: targetKcal ?? macros.kcal,
    protein: macros.protein_g,
    carbs: macros.carbs_g,
    fat: macros.fat_g,
  };

  const consumed = {
    kcal: macros.kcal,
    protein: macros.protein_g,
    carbs: macros.carbs_g,
    fat: macros.fat_g,
  };

  return (
    <div
      className={`flex flex-col items-center gap-6 rounded-2xl border border-border bg-surface-elevated p-6 shadow-1 ${className ?? ''}`}
    >
      <MacroRing consumed={consumed} target={target} />
      <div className="grid grid-cols-4 gap-3 w-full">
        <StatTile label="kcal" value={macros.kcal} />
        <StatTile label="protein" value={`${macros.protein_g}g`} />
        <StatTile label="carbs" value={`${macros.carbs_g}g`} />
        <StatTile label="fat" value={`${macros.fat_g}g`} />
      </div>
    </div>
  );
}
