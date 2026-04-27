'use client';

import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { cn } from '@/components/ui/utils';
import { markCookedById } from '@/server/recipes/actions';
import { CheckCircleIcon, ChefHatIcon } from 'lucide-react';
import { useState, useTransition } from 'react';

interface CookButtonProps {
  recipeId: string;
  recipeTitle: string;
}

// TODO: confirm with user — the spec mentions a 3-step cook wizard (log -> rate -> note).
// Currently this is an immediate log. To enable the wizard, wrap the markCooked call
// in a Sheet from '@/components/ui/sheet' with rating + note inputs.
// Flag: COOK_WIZARD = false (immediate log mode).

export function CookButton({ recipeId, recipeTitle }: CookButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [cooked, setCooked] = useState(false);
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [showRating, setShowRating] = useState(false);

  function handleCook() {
    startTransition(async () => {
      const result = await markCookedById(recipeId, rating ? { rating } : undefined);
      if (result.ok) {
        setCooked(true);
        setShowRating(false);
        toast.success(`${recipeTitle} added to your cooked log.`, {
          description: 'Logged!',
        });
      } else {
        toast.error(`Could not log — ${result.error.message}`);
      }
    });
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-30 border-t border-border bg-surface/90 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-2xl px-4 py-3 flex flex-col gap-2">
        {/* Inline rating (optional, pre-cook) */}
        {showRating && !cooked && (
          <div className="flex items-center justify-center gap-1">
            <span className="text-xs text-text-muted mr-2">Rate before logging:</span>
            {([1, 2, 3, 4, 5] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className={cn(
                  'text-lg transition-transform hover:scale-125',
                  rating != null && n <= rating ? 'opacity-100' : 'opacity-30',
                )}
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
              >
                ★
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          {!cooked && !showRating && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRating(true)}
              className="text-text-muted"
            >
              + Rating
            </Button>
          )}
          <Button
            onClick={handleCook}
            disabled={isPending || cooked}
            className={cn('flex-1 gap-2 font-semibold', cooked && 'bg-ok text-ok-fg')}
          >
            {cooked ? (
              <>
                <CheckCircleIcon strokeWidth={1.75} className="size-4" />
                Cooked — nice work
              </>
            ) : isPending ? (
              'Logging…'
            ) : (
              <>
                <ChefHatIcon strokeWidth={1.75} className="size-4" />
                Cook this
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
