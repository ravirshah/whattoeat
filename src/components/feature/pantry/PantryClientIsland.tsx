'use client';

import type { PantryCategory, PantryItem } from '@/contracts/zod/pantry';
import {
  addPantryItem,
  bulkAddCategorisedPantryItems,
  removePantryItem,
  togglePantryItem,
} from '@/server/pantry/actions';
import { PlusIcon, SearchIcon } from 'lucide-react';
import { useOptimistic, useState, useTransition } from 'react';
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
      addOptimisticAction({ type: 'toggle', id: item.id });
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
      addOptimisticAction({ type: 'remove', id: item.id });
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
    setItems((prev) => {
      const existingIds = new Set(prev.map((i) => i.id));
      return [...prev, ...newItems.filter((i) => !existingIds.has(i.id))];
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Search + add row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            placeholder="Search pantry…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-accent text-accent-foreground px-4 py-2 text-sm font-medium hover:bg-accent/90 transition-colors"
          aria-label="Add pantry item"
        >
          <PlusIcon className="size-4" />
          Add
        </button>
      </div>

      {/* Category filter */}
      <PantryCategoryFilter selected={categoryFilter} onSelect={setCategoryFilter} />

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
