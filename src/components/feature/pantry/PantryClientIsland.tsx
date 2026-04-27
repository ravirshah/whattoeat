'use client';

import type { PantryCategory, PantryItem } from '@/contracts/zod/pantry';
import { withViewTransition } from '@/lib/view-transition';
import {
  addPantryItem,
  bulkAddCategorisedPantryItems,
  removePantryItem,
  togglePantryItem,
} from '@/server/pantry/actions';
import { PlusIcon, SearchIcon, XIcon } from 'lucide-react';
import { useMemo, useOptimistic, useState, useTransition } from 'react';
import { PantryAddDialog } from './PantryAddDialog';
import { PantryCategoryFilter } from './PantryCategoryFilter';
import { PantryList } from './PantryList';

type OptimisticAction =
  | { type: 'add'; item: PantryItem }
  | { type: 'toggle'; id: string }
  | { type: 'remove'; id: string };

function applyOptimistic(state: PantryItem[], action: OptimisticAction): PantryItem[] {
  switch (action.type) {
    case 'add':
      return [...state, action.item];
    case 'toggle':
      return state.map((i) => (i.id === action.id ? { ...i, available: !i.available } : i));
    case 'remove':
      return state.filter((i) => i.id !== action.id);
  }
}

interface PantryClientIslandProps {
  initialItems: PantryItem[];
}

export function PantryClientIsland({ initialItems }: PantryClientIslandProps) {
  const [items, setItems] = useState<PantryItem[]>(initialItems);
  const [optimisticItems, addOptimisticAction] = useOptimistic(items, applyOptimistic);
  const [categoryFilter, setCategoryFilter] = useState<PantryCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  // -------------------------------------------------------------------------
  // Toggle (idempotent: pass desired next value, not !current)
  // -------------------------------------------------------------------------

  function handleToggle(item: PantryItem) {
    if (pendingIds.has(item.id)) return;
    const nextAvailable = !item.available;
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.add(item.id);
      return next;
    });
    startTransition(async () => {
      withViewTransition(() => addOptimisticAction({ type: 'toggle', id: item.id }));
      const result = await togglePantryItem(item.id, nextAvailable);
      if (result.ok) {
        setItems((prev) => prev.map((i) => (i.id === item.id ? result.value : i)));
      } else {
        // Explicit rollback: re-set items to current authoritative state so
        // the optimistic toggle is reverted on next render.
        console.error('[PantryClientIsland] toggle failed:', result.error.message);
        setItems((prev) => [...prev]);
      }
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    });
  }

  // -------------------------------------------------------------------------
  // Remove
  // -------------------------------------------------------------------------

  function handleRemove(item: PantryItem) {
    if (pendingIds.has(item.id)) return;
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.add(item.id);
      return next;
    });
    startTransition(async () => {
      withViewTransition(() => addOptimisticAction({ type: 'remove', id: item.id }));
      const result = await removePantryItem(item.id);
      if (result.ok) {
        setItems((prev) => prev.filter((i) => i.id !== item.id));
      } else {
        console.error('[PantryClientIsland] remove failed:', result.error.message);
        setItems((prev) => [...prev]);
      }
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    });
  }

  // -------------------------------------------------------------------------
  // Add (single + bulk — both routed through the dialog's onSuccess)
  // -------------------------------------------------------------------------

  function handleAddSuccess(newItems: PantryItem[]) {
    withViewTransition(() => {
      setItems((prev) => {
        const existingIds = new Set(prev.map((i) => i.id));
        return [...prev, ...newItems.filter((i) => !existingIds.has(i.id))];
      });
    });
  }

  const counts = useMemo(() => {
    const init: Record<PantryCategory, number> = {
      protein: 0,
      produce: 0,
      grain: 0,
      dairy: 0,
      pantry: 0,
      other: 0,
    };
    for (const item of optimisticItems) {
      init[item.category] = (init[item.category] ?? 0) + 1;
    }
    return init;
  }, [optimisticItems]);

  return (
    <div className="flex flex-col gap-4">
      {/* Search + add row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <SearchIcon
            strokeWidth={1.75}
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-muted pointer-events-none"
          />
          <input
            type="search"
            placeholder="Search pantry…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface pl-9 pr-9 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-text-muted hover:bg-surface-elevated hover:text-text transition-colors"
            >
              <XIcon strokeWidth={2} className="size-3.5" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-accent text-accent-fg px-4 py-2.5 text-sm font-semibold shadow-1 hover:opacity-90 active:scale-[0.98] transition-all duration-snap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Add pantry item"
        >
          <PlusIcon strokeWidth={2.25} className="size-4" />
          Add
        </button>
      </div>

      {/* Category filter */}
      <PantryCategoryFilter
        selected={categoryFilter}
        onSelect={(next) => withViewTransition(() => setCategoryFilter(next))}
        counts={counts}
      />

      {/* Chip grid */}
      <PantryList
        items={optimisticItems}
        categoryFilter={categoryFilter}
        searchQuery={searchQuery}
        onToggle={handleToggle}
        onRemove={handleRemove}
      />

      {/* Add dialog */}
      <PantryAddDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onAdd={addPantryItem}
        onBulkAddCategorised={bulkAddCategorisedPantryItems}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
}
