'use client';

import { cn } from '@/components/ui/utils';
import type { PantryCategory } from '@/contracts/zod/pantry';
import { useEffect, useRef, useState } from 'react';

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

const DOT: Record<PantryCategory, string> = {
  protein: 'bg-cat-protein',
  produce: 'bg-cat-produce',
  grain: 'bg-cat-grain',
  dairy: 'bg-cat-dairy',
  pantry: 'bg-cat-pantry',
  other: 'bg-cat-other',
};

interface PantryCategoryFilterProps {
  selected: PantryCategory | null;
  onSelect: (category: PantryCategory | null) => void;
  /** Per-category item counts. When provided, each chip shows a numeric badge. */
  counts?: Record<PantryCategory, number>;
  className?: string;
}

export function PantryCategoryFilter({
  selected,
  onSelect,
  counts,
  className,
}: PantryCategoryFilterProps) {
  const [pulseKey, setPulseKey] = useState<Record<PantryCategory, number>>({
    protein: 0,
    produce: 0,
    grain: 0,
    dairy: 0,
    pantry: 0,
    other: 0,
  });
  const prevCounts = useRef(counts);
  useEffect(() => {
    if (!counts || !prevCounts.current) {
      prevCounts.current = counts;
      return;
    }
    const changed: PantryCategory[] = [];
    for (const cat of ALL_CATEGORIES) {
      if (counts[cat] !== prevCounts.current[cat]) changed.push(cat);
    }
    if (changed.length > 0) {
      setPulseKey((prev) => {
        const next = { ...prev };
        for (const cat of changed) next[cat] = (prev[cat] ?? 0) + 1;
        return next;
      });
    }
    prevCounts.current = counts;
  }, [counts]);

  return (
    <fieldset
      className={cn(
        '-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0',
        className,
      )}
      aria-label="Filter by category"
    >
      <button
        type="button"
        onClick={() => onSelect(null)}
        aria-pressed={selected === null}
        className={cn(
          'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          selected === null
            ? 'border-accent bg-accent text-accent-fg'
            : 'border-border bg-surface text-text-muted hover:border-accent/40 hover:text-text',
        )}
      >
        All
      </button>
      {ALL_CATEGORIES.map((cat) => {
        const isActive = selected === cat;
        const count = counts?.[cat] ?? 0;
        const visible = !counts || count > 0 || isActive;
        if (!visible) return null;
        return (
          <button
            key={cat}
            type="button"
            onClick={() => onSelect(isActive ? null : cat)}
            aria-pressed={isActive}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isActive
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border bg-surface text-text-muted hover:border-accent/40 hover:text-text',
            )}
          >
            <span
              key={`dot-${cat}-${pulseKey[cat]}`}
              className={cn('size-2 rounded-full count-pulse', DOT[cat])}
              aria-hidden
            />
            {LABEL[cat]}
            {counts && count > 0 && (
              <span
                className={cn(
                  'rounded-full px-1.5 text-[10px] font-semibold tabular-nums',
                  isActive ? 'bg-accent/20 text-accent' : 'bg-surface-elevated text-text-muted',
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </fieldset>
  );
}
