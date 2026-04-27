'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/components/ui/utils';
import type { MealCandidate } from '@/contracts/zod/recommendation';
import { modifyRecipe } from '@/server/recommendation/modify';
import { RotateCcw, Sparkles } from 'lucide-react';
import { useRef, useState, useTransition } from 'react';

const QUICK_TWEAKS = [
  'Faster',
  'More protein',
  'Make it vegetarian',
  'Different cuisine',
  'Half the carbs',
] as const;

interface RecipeTweakPanelProps {
  runId: string;
  candidateIndex: number;
  onModified: (candidate: MealCandidate) => void;
  onReverted: () => void;
  isTweaked: boolean;
}

export function RecipeTweakPanel({
  runId,
  candidateIndex,
  onModified,
  onReverted,
  isTweaked,
}: RecipeTweakPanelProps) {
  const [instruction, setInstruction] = useState('');
  const [priorTweaks, setPriorTweaks] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setError(null);

    startTransition(async () => {
      const result = await modifyRecipe({
        runId,
        candidateIndex,
        instruction: trimmed,
        priorTweaks,
      });

      if (result.ok) {
        setPriorTweaks((prev) => [...prev, trimmed]);
        setInstruction('');
        onModified(result.value);
      } else {
        setError(result.error.message);
      }
    });
  }

  function handleRevert() {
    setPriorTweaks([]);
    setInstruction('');
    setError(null);
    onReverted();
  }

  return (
    <div className="mt-3 px-1 space-y-2">
      {priorTweaks.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {priorTweaks.map((t) => (
            <span
              key={t}
              className="inline-flex items-center rounded-full bg-surface-elevated border border-border px-2.5 py-0.5 text-xs text-text-secondary"
            >
              {t}
            </span>
          ))}
          {isTweaked && (
            <button
              type="button"
              onClick={handleRevert}
              className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-text transition-colors ml-1"
              aria-label="Revert to original recipe"
            >
              <RotateCcw className="h-3 w-3" />
              Revert
            </button>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {QUICK_TWEAKS.map((chip) => (
          <button
            key={chip}
            type="button"
            disabled={isPending}
            onClick={() => submit(chip)}
            className={cn(
              'rounded-full border border-border px-3 py-1 text-xs font-medium',
              'text-text-secondary bg-surface hover:bg-surface-elevated hover:text-text',
              'transition-colors duration-snap disabled:opacity-40 disabled:cursor-not-allowed',
            )}
          >
            {chip}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          ref={inputRef}
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isPending) submit(instruction);
          }}
          placeholder="Tell me how to change this…"
          disabled={isPending}
          className="flex-1 text-sm"
          aria-label="Recipe modification instruction"
        />
        <Button
          size="sm"
          variant="default"
          disabled={isPending || !instruction.trim()}
          onClick={() => submit(instruction)}
          aria-label="Apply tweak"
        >
          <Sparkles className="h-3.5 w-3.5" />
        </Button>
      </div>

      {error && <p className="text-xs text-err">{error}</p>}
    </div>
  );
}
