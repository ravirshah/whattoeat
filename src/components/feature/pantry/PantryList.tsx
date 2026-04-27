'use client';

import { PantryChip } from '@/components/ui/pantry-chip';
import { cn } from '@/components/ui/utils';
import type { PantryCategory, PantryItem } from '@/contracts/zod/pantry';
import { PackageOpenIcon, SearchXIcon } from 'lucide-react';

const CATEGORY_ORDER: PantryCategory[] = [
  'protein',
  'produce',
  'grain',
  'dairy',
  'pantry',
  'other',
];

const CATEGORY_LABEL: Record<PantryCategory, string> = {
  protein: 'Protein',
  produce: 'Produce',
  grain: 'Grain',
  dairy: 'Dairy',
  pantry: 'Pantry',
  other: 'Other',
};

const CATEGORY_DOT: Record<PantryCategory, string> = {
  protein: 'bg-cat-protein',
  produce: 'bg-cat-produce',
  grain: 'bg-cat-grain',
  dairy: 'bg-cat-dairy',
  pantry: 'bg-cat-pantry',
  other: 'bg-cat-other',
};

interface PantryListProps {
  items: PantryItem[];
  categoryFilter: PantryCategory | null;
  searchQuery: string;
  onToggle: (item: PantryItem) => void;
  onRemove: (item: PantryItem) => void;
}

export function PantryList({
  items,
  categoryFilter,
  searchQuery,
  onToggle,
  onRemove,
}: PantryListProps) {
  const query = searchQuery.toLowerCase().trim();

  const filtered = items.filter((item) => {
    if (categoryFilter && item.category !== categoryFilter) return false;
    if (query && !item.display_name.toLowerCase().includes(query)) return false;
    return true;
  });

  if (filtered.length === 0) {
    const isSearching = Boolean(query) || categoryFilter !== null;
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-surface-elevated/40 px-6 py-16 text-center',
        )}
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-surface text-text-muted">
          {isSearching ? (
            <SearchXIcon strokeWidth={1.75} className="size-5" />
          ) : (
            <PackageOpenIcon strokeWidth={1.75} className="size-5" />
          )}
        </span>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-text">
            {isSearching ? 'No matches' : 'Pantry is empty'}
          </p>
          <p className="text-xs text-text-muted">
            {query
              ? `Nothing here matches "${searchQuery}".`
              : categoryFilter
                ? `No items in ${CATEGORY_LABEL[categoryFilter]} yet.`
                : 'Tap "Add" to dump in whatever you have on hand.'}
          </p>
        </div>
      </div>
    );
  }

  const grouped = CATEGORY_ORDER.reduce<Record<PantryCategory, PantryItem[]>>(
    (acc, cat) => {
      acc[cat] = filtered.filter((i) => i.category === cat);
      return acc;
    },
    {} as Record<PantryCategory, PantryItem[]>,
  );

  return (
    <div className="flex flex-col gap-6">
      {CATEGORY_ORDER.filter((cat) => grouped[cat].length > 0).map((cat) => {
        const list = grouped[cat];
        const availableCount = list.filter((i) => i.available).length;
        return (
          <section key={cat} aria-labelledby={`category-heading-${cat}`}>
            <header
              id={`category-heading-${cat}`}
              className="mb-2.5 flex items-baseline justify-between gap-2"
            >
              <div className="flex items-center gap-2">
                <span className={cn('size-2 rounded-full', CATEGORY_DOT[cat])} aria-hidden />
                <h3 className="text-xs font-semibold uppercase tracking-widest text-text-muted">
                  {CATEGORY_LABEL[cat]}
                </h3>
                <span className="font-mono text-[11px] tabular-nums text-text-muted/70">
                  {availableCount}/{list.length}
                </span>
              </div>
            </header>
            <div className="flex flex-wrap gap-2">
              {list.map((item) => (
                <PantryChip
                  key={item.id}
                  id={item.id}
                  name={item.display_name}
                  category={item.category}
                  available={item.available}
                  onToggle={() => onToggle(item)}
                  onRemove={() => onRemove(item)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
