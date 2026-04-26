'use client';

import { cn } from '@/components/ui/utils';
import type { PantryCategory } from '@/contracts/zod/pantry';

const ALL_CATEGORIES: PantryCategory[] = [
  'protein',
  'produce',
  'grain',
  'dairy',
  'pantry',
  'other',
];

const LABEL: Record<PantryCategory, string> = {
  protein: 'Protein',
  produce: 'Produce',
  grain: 'Grain',
  dairy: 'Dairy',
  pantry: 'Pantry',
  other: 'Other',
};

interface PantryCategoryFilterProps {
  selected: PantryCategory | null;
  onSelect: (category: PantryCategory | null) => void;
  className?: string;
}

export function PantryCategoryFilter({ selected, onSelect, className }: PantryCategoryFilterProps) {
  return (
    <fieldset className={cn('flex flex-wrap gap-2', className)} aria-label="Filter by category">
      <button
        type="button"
        onClick={() => onSelect(null)}
        aria-pressed={selected === null}
        className={cn(
          'rounded-full border px-3 py-1 text-sm font-medium transition-colors',
          selected === null
            ? 'bg-accent text-accent-foreground border-accent'
            : 'border-border text-muted-foreground hover:border-accent/50',
        )}
      >
        All
      </button>
      {ALL_CATEGORIES.map((cat) => (
        <button
          key={cat}
          type="button"
          onClick={() => onSelect(cat === selected ? null : cat)}
          aria-pressed={selected === cat}
          className={cn(
            'rounded-full border px-3 py-1 text-sm font-medium transition-colors',
            selected === cat
              ? 'bg-accent text-accent-foreground border-accent'
              : 'border-border text-muted-foreground hover:border-accent/50',
          )}
        >
          {LABEL[cat]}
        </button>
      ))}
    </fieldset>
  );
}
