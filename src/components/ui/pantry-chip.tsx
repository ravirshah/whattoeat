'use client';
import { cn } from '@/components/ui/utils';
import { XIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type PantryCategory = 'protein' | 'produce' | 'grain' | 'dairy' | 'pantry' | 'other';

interface PantryChipProps {
  /** Stable identifier — used to form the `view-transition-name`. */
  id?: string;
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

const HOLD_MS = 600;

/**
 * PantryChip — togglable chip with category color and a tactile long-press
 * remove gesture (a radial progress ring fills around the chip; release early
 * to cancel). The X button remains as an accessible immediate fallback.
 */
export function PantryChip({
  id,
  name,
  category,
  available,
  onToggle,
  onRemove,
  className,
}: PantryChipProps) {
  const [pressing, setPressing] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completed = useRef(false);

  useEffect(() => {
    return () => {
      if (holdTimer.current) clearTimeout(holdTimer.current);
    };
  }, []);

  function startHold() {
    if (!onRemove) return;
    completed.current = false;
    setPressing(true);
    holdTimer.current = setTimeout(() => {
      completed.current = true;
      setPressing(false);
      onRemove?.();
    }, HOLD_MS);
  }

  function cancelHold() {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    setPressing(false);
  }

  function handleClick() {
    // If a long-press just fired the remove, swallow the click.
    if (completed.current) {
      completed.current = false;
      return;
    }
    onToggle?.();
  }

  const vtName = id ? `vt-chip-${id}` : undefined;

  return (
    <span
      className={cn(
        'relative isolate inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium chip-press',
        'transition-[opacity,filter] duration-snap select-none',
        categoryColorMap[category],
        !available && 'opacity-40',
        className,
      )}
      style={vtName ? ({ viewTransitionName: vtName } as React.CSSProperties) : undefined}
    >
      {/* Long-press progress ring — sits behind the chip text */}
      {onRemove && (
        <span
          aria-hidden
          data-pressing={pressing ? 'true' : 'false'}
          className="press-ring pointer-events-none absolute -inset-px rounded-full"
        />
      )}

      <button
        type="button"
        aria-pressed={available}
        onClick={handleClick}
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        onPointerCancel={cancelHold}
        onContextMenu={(e) => e.preventDefault()}
        className="relative z-[1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
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
          className="relative z-[1] rounded-full p-0.5 hover:bg-text/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <XIcon strokeWidth={1.75} className="size-3" />
        </button>
      )}
    </span>
  );
}
