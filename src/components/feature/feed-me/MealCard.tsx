'use client';

import { Button } from '@/components/ui/button';
import { MealCard as MealCardPrimitive } from '@/components/ui/meal-card';
import { toast } from '@/components/ui/toast';
import type { MealCandidate } from '@/contracts/zod/recommendation';
import { markCooked, saveRecipe } from '@/server/recipes/actions';
import { Bookmark, ChefHat, Loader2 } from 'lucide-react';
import { useOptimistic, useState, useTransition } from 'react';

interface MealCardProps {
  candidate: MealCandidate;
  /** 0-based index used for the staggered reveal delay. */
  index: number;
}

type CardState = 'idle' | 'saving' | 'saved' | 'cooking' | 'cooked';

export function MealCard({ candidate, index }: MealCardProps) {
  const [state, setState] = useState<CardState>('idle');
  const [optimisticState, setOptimisticState] = useOptimistic<CardState>(state);
  const [, startTransition] = useTransition();

  const staggerDelayMs = index * 80;

  async function handleSave() {
    setOptimisticState('saving');
    startTransition(async () => {
      const result = await saveRecipe(candidate);
      if (result.ok) {
        setState('saved');
        toast.success(`"${candidate.title}" saved to your recipes.`);
      } else {
        setState('idle');
        toast.error(`Could not save — ${result.error.message}`);
      }
    });
  }

  async function handleCook() {
    setOptimisticState('cooking');
    startTransition(async () => {
      const result = await markCooked(candidate);
      if (result.ok) {
        setState('cooked');
        toast.success(`Logged "${candidate.title}" as cooked!`);
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

  // Adapt MealCandidate.estMacros (protein_g/carbs_g/fat_g) to UI MealCard (protein/carbs/fat)
  const estMacros = {
    kcal: candidate.estMacros.kcal,
    protein: candidate.estMacros.protein_g,
    carbs: candidate.estMacros.carbs_g,
    fat: candidate.estMacros.fat_g,
  };

  return (
    <div
      className="animate-in fade-in slide-in-from-bottom-4"
      style={{ animationDelay: `${staggerDelayMs}ms`, animationFillMode: 'both' }}
    >
      <MealCardPrimitive
        title={candidate.title}
        oneLineWhy={candidate.oneLineWhy}
        totalMinutes={candidate.totalMinutes}
        estMacros={estMacros}
        missingItems={candidate.missingItems}
        pantryCoverage={candidate.pantryCoverage}
      />
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
      </div>
    </div>
  );
}
