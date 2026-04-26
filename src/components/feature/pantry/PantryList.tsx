'use client';

import { PantryChip } from '@/components/ui/pantry-chip';
import type { PantryCategory, PantryItem } from '@/contracts/zod/pantry';

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
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
        <p className="text-base font-medium">Nothing here yet.</p>
        <p className="mt-1 text-sm">
          {query
            ? `No items match "${searchQuery}".`
            : 'Add your first pantry item to get started.'}
        </p>
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
    <div className="space-y-6">
      {CATEGORY_ORDER.filter((cat) => grouped[cat].length > 0).map((cat) => (
        <section key={cat} aria-labelledby={`category-heading-${cat}`}>
          <h3
            id={`category-heading-${cat}`}
            className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground"
          >
            {CATEGORY_LABEL[cat]}
          </h3>
          <div className="flex flex-wrap gap-2">
            {grouped[cat].map((item) => (
              <PantryChip
                key={item.id}
                name={item.display_name}
                category={item.category}
                available={item.available}
                onToggle={() => onToggle(item)}
                onRemove={() => onRemove(item)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
