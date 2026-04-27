'use client';

import { Button } from '@/components/ui/button';
import { MealCard as MealCardPrimitive } from '@/components/ui/meal-card';
import { toast } from '@/components/ui/toast';
import { cn } from '@/components/ui/utils';
import type { MealCandidate } from '@/contracts/zod/recommendation';
import { markCooked, saveRecipe } from '@/server/recipes/actions';
import { Bookmark, ChefHat, Loader2, Wand2 } from 'lucide-react';
import { useOptimistic, useState, useTransition } from 'react';
import { RecipeTweakPanel } from './RecipeTweakPanel';

interface MealCardProps {
  candidate: MealCandidate;
  /** 0-based index used for the staggered reveal delay. */
  index: number;
  runId?: string;
}

type CardState = 'idle' | 'saving' | 'saved' | 'cooking' | 'cooked';

export function MealCard({ candidate, index, runId }: MealCardProps) {
  const [state, setState] = useState<CardState>('idle');
  const [optimisticState, setOptimisticState] = useOptimistic<CardState>(state);
  const [, startTransition] = useTransition();
  const [modified, setModified] = useState<MealCandidate | null>(null);
  const [tweakOpen, setTweakOpen] = useState(false);

  const displayed = modified ?? candidate;
  const isTweaked = modified !== null;

  const staggerDelayMs = index * 80;

  async function handleSave() {
    setOptimisticState('saving');
    startTransition(async () => {
      const result = await saveRecipe(displayed);
      if (result.ok) {
        setState('saved');
        toast.success(`"${displayed.title}" saved to your recipes.`);
      } else {
        setState('idle');
        toast.error(`Could not save — ${result.error.message}`);
      }
    });
  }

  async function handleCook() {
    setOptimisticState('cooking');
    startTransition(async () => {
      const result = await markCooked(displayed);
      if (result.ok) {
        setState('cooked');
        toast.success(`Logged "${displayed.title}" as cooked!`);
      } else {
        setState('idle');
        toast.error(`Could not log — ${result.error.message}`);
      }
    });
  }

  const isSaving = optimisticState === 'saving';
  const isCooking = optimisticState === 'cooking';
  const isSaved = optimisticState === 'saved';
  const isCooked = optimisticState === 'cooked';

  const estMacros = {
    kcal: displayed.estMacros.kcal,
    protein: displayed.estMacros.protein_g,
    carbs: displayed.estMacros.carbs_g,
    fat: displayed.estMacros.fat_g,
  };

  return (
    <div
      className="animate-in fade-in slide-in-from-bottom-4"
      style={{ animationDelay: `${staggerDelayMs}ms`, animationFillMode: 'both' }}
    >
      <div className={cn('relative', isTweaked && 'ring-1 ring-accent/40 rounded-xl')}>
        {isTweaked && (
          <span className="absolute top-2 right-2 z-10 rounded-full bg-accent/10 border border-accent/30 px-2 py-0.5 text-[10px] font-medium text-accent">
            edited
          </span>
        )}
        <MealCardPrimitive
          title={displayed.title}
          oneLineWhy={displayed.oneLineWhy}
          totalMinutes={displayed.totalMinutes}
          estMacros={estMacros}
          missingItems={displayed.missingItems}
          pantryCoverage={displayed.pantryCoverage}
        />
      </div>

      <div className="flex gap-2 mt-3 px-1">
        <Button
          size="sm"
          variant={isSaved ? 'secondary' : 'outline'}
          disabled={isSaving || isSaved || isCooked}
          onClick={handleSave}
          aria-label={isSaved ? 'Saved' : 'Save recipe'}
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
          )}
          <span className="ml-1.5">{isSaved ? 'Saved' : 'Save'}</span>
        </Button>

        <Button
          size="sm"
          variant={isCooked ? 'secondary' : 'default'}
          disabled={isCooking || isCooked}
          onClick={handleCook}
          aria-label={isCooked ? 'Cooked!' : 'I cooked this'}
        >
          {isCooking ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ChefHat className="h-4 w-4" />
          )}
          <span className="ml-1.5">{isCooked ? 'Cooked!' : 'I cooked this'}</span>
        </Button>

        {runId && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setTweakOpen((o) => !o)}
            aria-label="Tweak recipe"
          >
            <Wand2 className="h-4 w-4" />
            <span className="ml-1.5">Tweak it</span>
          </Button>
        )}
      </div>

      {runId && tweakOpen && (
        <RecipeTweakPanel
          runId={runId}
          candidateIndex={index}
          onModified={setModified}
          onReverted={() => setModified(null)}
          isTweaked={isTweaked}
        />
      )}
    </div>
  );
}
