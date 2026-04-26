'use client';

import { cn } from '@/components/ui/utils';
import type { PantryCategory, PantryItem } from '@/contracts/zod/pantry';
import type { ActionResult } from '@/server/contracts';
import { ListIcon, PlusIcon } from 'lucide-react';
import { useState, useTransition } from 'react';

const ALL_CATEGORIES: PantryCategory[] = [
  'protein',
  'produce',
  'grain',
  'dairy',
  'pantry',
  'other',
];

interface PantryAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (input: { name: string; category: PantryCategory }) => Promise<ActionResult<PantryItem>>;
  onBulkAdd: (names: string[]) => Promise<ActionResult<PantryItem[]>>;
  onSuccess: (items: PantryItem[]) => void;
}

export function PantryAddDialog({
  open,
  onOpenChange,
  onAdd,
  onBulkAdd,
  onSuccess,
}: PantryAddDialogProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<PantryCategory>('other');
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setName('');
    setCategory('other');
    setBulkText('');
    setError(null);
    setBulkMode(false);
  }

  function handleClose() {
    reset();
    onOpenChange(false);
  }

  function handleSingleAdd() {
    if (!name.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await onAdd({ name: name.trim(), category });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      onSuccess([result.value]);
      handleClose();
    });
  }

  function handleBulkAdd() {
    const names = bulkText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (names.length === 0) return;
    setError(null);
    startTransition(async () => {
      const result = await onBulkAdd(names);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      onSuccess(result.value);
      handleClose();
    });
  }

  if (!open) return null;

  return (
    <dialog
      open
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center m-0 p-0 max-w-none w-full h-full bg-transparent border-0"
      aria-label="Add pantry item"
      onClose={handleClose}
    >
      {/* Overlay — keyboard-accessible close via Escape (dialog handles it) */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-surface p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add to pantry</h2>
          <button
            type="button"
            onClick={() => setBulkMode((v) => !v)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            aria-label={bulkMode ? 'Switch to single add' : 'Switch to bulk add'}
          >
            <ListIcon className="size-4" />
            {bulkMode ? 'Single' : 'Bulk paste'}
          </button>
        </div>

        {bulkMode ? (
          <>
            <textarea
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[120px] resize-none"
              placeholder={'chicken breast, eggs, rice\n(one item per line or comma-separated)'}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
            />
            {/* TODO: Track 8 — LLM name normalization for each pasted item */}
          </>
        ) : (
          <>
            <input
              type="text"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="e.g. chicken breast"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSingleAdd()}
            />
            {/* Category selector */}
            <div className="mt-3 flex flex-wrap gap-2">
              {ALL_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  aria-pressed={category === cat}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    category === cat
                      ? 'bg-accent text-accent-foreground border-accent'
                      : 'border-border text-muted-foreground hover:border-accent/50',
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </>
        )}

        {error && (
          <p className="mt-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={bulkMode ? handleBulkAdd : handleSingleAdd}
            disabled={isPending || (bulkMode ? !bulkText.trim() : !name.trim())}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-accent text-accent-foreground py-2.5 text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors"
          >
            <PlusIcon className="size-4" />
            {isPending ? 'Adding…' : bulkMode ? 'Add all' : 'Add'}
          </button>
        </div>
      </div>
    </dialog>
  );
}
