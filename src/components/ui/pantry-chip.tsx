'use client';
import { cn } from '@/components/ui/utils';
import { XIcon } from 'lucide-react';

type PantryCategory = 'protein' | 'produce' | 'grain' | 'dairy' | 'pantry' | 'other';

interface PantryChipProps {
  name: string;
  category: PantryCategory;
  available: boolean;
  onToggle?: () => void;
  onRemove?: () => void;
  className?: string;
}

const categoryColorMap: Record<PantryCategory, string> = {
  protein: 'bg-cat-protein/20 text-cat-protein border-cat-protein/30',
  produce: 'bg-cat-produce/20 text-cat-produce border-cat-produce/30',
  grain: 'bg-cat-grain/20   text-cat-grain   border-cat-grain/30',
  dairy: 'bg-cat-dairy/20   text-cat-dairy   border-cat-dairy/30',
  pantry: 'bg-cat-pantry/20  text-cat-pantry  border-cat-pantry/30',
  other: 'bg-cat-other/20   text-cat-other   border-cat-other/30',
};

/**
 * PantryChip — togglable chip with category color and optional remove button.
 *
 * TODO: Plan 05 fills — real server action wiring, voice add, optimistic UI.
 */
export function PantryChip({
  name,
  category,
  available,
  onToggle,
  onRemove,
  className,
}: PantryChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium',
        'transition-all duration-snap select-none',
        categoryColorMap[category],
        !available && 'opacity-40',
        className,
      )}
    >
      <button
        type="button"
        aria-pressed={available}
        onClick={onToggle}
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
      >
        {name}
      </button>
      {onRemove && (
        <button
          type="button"
          aria-label={`Remove ${name}`}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="rounded-full p-0.5 hover:bg-text/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <XIcon strokeWidth={1.75} className="size-3" />
        </button>
      )}
    </span>
  );
}
