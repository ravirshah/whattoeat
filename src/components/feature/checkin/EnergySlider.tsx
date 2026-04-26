'use client';
import { cn } from '@/components/ui/utils';

const ENERGY_LABELS: Record<number, { label: string; description: string }> = {
  1: { label: '1', description: 'Depleted' },
  2: { label: '2', description: 'Low' },
  3: { label: '3', description: 'Okay' },
  4: { label: '4', description: 'Good' },
  5: { label: '5', description: 'Fired up' },
};

interface EnergySliderProps {
  value: number;
  onChange: (value: number) => void;
}

/**
 * Five-button energy picker (1-5). Uses design tokens only - no raw hex.
 */
export function EnergySlider({ value, onChange }: EnergySliderProps) {
  return (
    <fieldset className="flex gap-2 border-0 p-0 m-0" aria-label="Energy level 1 to 5">
      {[1, 2, 3, 4, 5].map((level) => {
        const isActive = value === level;
        const meta = ENERGY_LABELS[level] ?? { label: String(level), description: String(level) };
        return (
          <button
            key={level}
            type="button"
            aria-pressed={isActive}
            aria-label={`Energy ${level}: ${meta.description}`}
            onClick={() => onChange(level)}
            className={cn(
              'flex-1 rounded-lg py-3 text-center transition-all duration-snap',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'border',
              isActive
                ? 'bg-accent text-accent-fg border-accent font-semibold shadow-1'
                : 'bg-surface-elevated border-border text-text-muted hover:border-accent/40 hover:text-text',
            )}
          >
            <span className="block text-base font-mono">{meta.label}</span>
            <span className="block text-[10px] leading-tight mt-0.5">{meta.description}</span>
          </button>
        );
      })}
    </fieldset>
  );
}
