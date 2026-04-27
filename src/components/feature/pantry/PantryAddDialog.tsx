'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/utils';
import type { PantryCategory, PantryItem } from '@/contracts/zod/pantry';
import type { ActionResult } from '@/server/contracts';
import type { ParsedPantryItem } from '@/server/pantry/parse-freeform';
import { parsePantryFreeform } from '@/server/pantry/parse-freeform';
import { ArrowLeftIcon, PlusIcon, SparklesIcon, XIcon } from 'lucide-react';
import { useState, useTransition } from 'react';

const ALL_CATEGORIES: PantryCategory[] = [
  'protein',
  'produce',
  'grain',
  'dairy',
  'pantry',
  'other',
];

const CATEGORY_COLOR: Record<PantryCategory, string> = {
  protein: 'bg-cat-protein/15 text-cat-protein border-cat-protein/30',
  produce: 'bg-cat-produce/15 text-cat-produce border-cat-produce/30',
  grain: 'bg-cat-grain/15 text-cat-grain border-cat-grain/30',
  dairy: 'bg-cat-dairy/15 text-cat-dairy border-cat-dairy/30',
  pantry: 'bg-cat-pantry/15 text-cat-pantry border-cat-pantry/30',
  other: 'bg-cat-other/15 text-cat-other border-cat-other/30',
};

interface PantryAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (input: { name: string; category: PantryCategory }) => Promise<ActionResult<PantryItem>>;
  onBulkAddCategorised: (
    items: { name: string; category: PantryCategory }[],
  ) => Promise<ActionResult<PantryItem[]>>;
  onSuccess: (items: PantryItem[]) => void;
}

type Phase =
  | { kind: 'compose' }
  | { kind: 'review'; items: ParsedPantryItem[] }
  | { kind: 'manual' };

const FREEFORM_EXAMPLES = [
  '6 eggs, leftover roast chicken, half a bag of rice, kale, sriracha',
  '2 lbs ground turkey, sweet potatoes, frozen broccoli, almond milk, oats',
  'whatever was on the bottom shelf: greek yogurt, blueberries, peanut butter, sourdough',
];

export function PantryAddDialog({
  open,
  onOpenChange,
  onAdd,
  onBulkAddCategorised,
  onSuccess,
}: PantryAddDialogProps) {
  const [phase, setPhase] = useState<Phase>({ kind: 'compose' });
  const [text, setText] = useState('');
  const [singleName, setSingleName] = useState('');
  const [singleCategory, setSingleCategory] = useState<PantryCategory>('other');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const placeholder = FREEFORM_EXAMPLES[0];

  function reset() {
    setPhase({ kind: 'compose' });
    setText('');
    setSingleName('');
    setSingleCategory('other');
    setError(null);
  }

  function handleClose() {
    reset();
    onOpenChange(false);
  }

  function handleParse() {
    if (!text.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await parsePantryFreeform(text);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      if (result.value.length === 0) {
        setError("I couldn't pick anything out of that — try listing items separated by commas.");
        return;
      }
      setPhase({ kind: 'review', items: result.value });
    });
  }

  function handleConfirm() {
    if (phase.kind !== 'review') return;
    setError(null);
    startTransition(async () => {
      const result = await onBulkAddCategorised(
        phase.items.map((i) => ({ name: i.name, category: i.category })),
      );
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      onSuccess(result.value);
      handleClose();
    });
  }

  function handleManualAdd() {
    if (!singleName.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await onAdd({ name: singleName.trim(), category: singleCategory });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      onSuccess([result.value]);
      handleClose();
    });
  }

  function updateReviewItem(idx: number, patch: Partial<ParsedPantryItem>) {
    if (phase.kind !== 'review') return;
    const next = phase.items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    setPhase({ kind: 'review', items: next });
  }

  function removeReviewItem(idx: number) {
    if (phase.kind !== 'review') return;
    setPhase({ kind: 'review', items: phase.items.filter((_, i) => i !== idx) });
  }

  if (!open) return null;

  return (
    <dialog
      open
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center m-0 p-0 max-w-none w-full h-full bg-transparent border-0"
      aria-label="Add to pantry"
      onClose={handleClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-card border border-border p-5 sm:p-6 shadow-3 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {phase.kind === 'review' && (
              <button
                type="button"
                onClick={() => setPhase({ kind: 'compose' })}
                className="rounded-md p-1 text-muted-foreground hover:bg-surface-elevated hover:text-foreground transition-colors"
                aria-label="Back to compose"
              >
                <ArrowLeftIcon className="size-4" />
              </button>
            )}
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              {phase.kind === 'review'
                ? "Here's what I parsed"
                : phase.kind === 'manual'
                  ? 'Add one item'
                  : 'Add to pantry'}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-surface-elevated hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        {/* Compose: freeform LLM input */}
        {phase.kind === 'compose' && (
          <>
            <div className="mb-2 flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <SparklesIcon className="size-3.5 text-accent" strokeWidth={2.5} />
              <span>Type, paste, or dump — I&apos;ll figure out what&apos;s what.</span>
            </div>

            <textarea
              // biome-ignore lint/a11y/noAutofocus: dialog opens on user click; focus is intentional
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={placeholder}
              rows={5}
              className={cn(
                'w-full rounded-xl border border-border bg-surface px-4 py-3',
                'text-[14px] leading-relaxed text-foreground placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
                'resize-none',
              )}
            />

            {/* Example chips — tappable seeds */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {FREEFORM_EXAMPLES.map((ex, i) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setText(ex)}
                  className="rounded-full border border-dashed border-border bg-surface-elevated px-2.5 py-1 text-[11px] text-muted-foreground hover:border-accent/50 hover:text-foreground transition-colors"
                >
                  Example {i + 1}
                </button>
              ))}
            </div>

            {error && (
              <p className="mt-3 text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <div className="mt-5 flex flex-col gap-2">
              <Button onClick={handleParse} disabled={!text.trim() || isPending} className="w-full">
                <SparklesIcon className="size-4" />
                {isPending ? 'Reading…' : 'Parse with AI'}
              </Button>
              <button
                type="button"
                onClick={() => setPhase({ kind: 'manual' })}
                className="text-center text-[12px] text-muted-foreground hover:text-foreground transition-colors"
              >
                or add a single item manually
              </button>
            </div>
          </>
        )}

        {/* Review: editable parsed list */}
        {phase.kind === 'review' && (
          <>
            <p className="mb-3 text-[12px] text-muted-foreground">
              Edit names, change categories, or remove anything I got wrong before saving.
            </p>

            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {phase.items.map((item, idx) => (
                <div
                  key={`${item.name}-${idx}`}
                  className="flex items-center gap-2 rounded-lg border border-border bg-surface-elevated px-3 py-2"
                >
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => updateReviewItem(idx, { name: e.target.value })}
                    className="flex-1 min-w-0 bg-transparent text-[14px] text-foreground focus:outline-none"
                  />
                  <select
                    value={item.category}
                    onChange={(e) =>
                      updateReviewItem(idx, { category: e.target.value as PantryCategory })
                    }
                    className={cn(
                      'rounded-md border px-2 py-1 text-[11px] font-medium capitalize bg-transparent',
                      CATEGORY_COLOR[item.category],
                    )}
                  >
                    {ALL_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeReviewItem(idx)}
                    className="rounded-md p-1 text-muted-foreground hover:bg-card hover:text-foreground transition-colors"
                    aria-label={`Remove ${item.name}`}
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {error && (
              <p className="mt-3 text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <div className="mt-5 flex gap-2">
              <Button
                variant="outline"
                onClick={() => setPhase({ kind: 'compose' })}
                disabled={isPending}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isPending || phase.items.length === 0}
                className="flex-1"
              >
                {isPending
                  ? 'Saving…'
                  : `Add ${phase.items.length} ${phase.items.length === 1 ? 'item' : 'items'}`}
              </Button>
            </div>
          </>
        )}

        {/* Manual fallback */}
        {phase.kind === 'manual' && (
          <>
            <input
              type="text"
              // biome-ignore lint/a11y/noAutofocus: manual mode reveals on user click; focus is intentional
              autoFocus
              value={singleName}
              onChange={(e) => setSingleName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualAdd()}
              placeholder="e.g. chicken breast"
              className={cn(
                'w-full rounded-lg border border-border bg-surface px-3 py-2',
                'text-sm text-foreground placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-ring',
              )}
            />

            <div className="mt-3 flex flex-wrap gap-1.5">
              {ALL_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSingleCategory(c)}
                  aria-pressed={singleCategory === c}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize transition-colors',
                    singleCategory === c
                      ? CATEGORY_COLOR[c]
                      : 'border-border text-muted-foreground hover:border-accent/40',
                  )}
                >
                  {c}
                </button>
              ))}
            </div>

            {error && (
              <p className="mt-3 text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <div className="mt-5 flex gap-2">
              <Button
                variant="outline"
                onClick={() => setPhase({ kind: 'compose' })}
                disabled={isPending}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleManualAdd}
                disabled={isPending || !singleName.trim()}
                className="flex-1"
              >
                <PlusIcon className="size-4" />
                {isPending ? 'Adding…' : 'Add'}
              </Button>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
