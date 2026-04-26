'use client';
import { cn } from '@/components/ui/utils';

interface SegmentedControlProps<T extends string> {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'default';
}

/**
 * iOS-style segmented control. Pure client-side — no Radix dependency.
 * Used for Goal picker (cut/maintain/bulk), Training picker, etc.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  size = 'default',
}: SegmentedControlProps<T>) {
  const activeIndex = options.findIndex((o) => o.value === value);

  return (
    <fieldset
      aria-label="Segmented control"
      className={cn(
        'relative inline-flex rounded-lg bg-surface-elevated p-1 border-0 p-0 m-0',
        className,
      )}
    >
      {/* Sliding indicator */}
      {activeIndex >= 0 && (
        <span
          aria-hidden
          className="absolute top-1 bottom-1 rounded-md bg-surface shadow-1 transition-all duration-snap ease-spring"
          style={{
            width: `calc((100% - 0.5rem) / ${options.length})`,
            left: `calc(${activeIndex} * (100% - 0.5rem) / ${options.length} + 0.25rem)`,
          }}
        />
      )}

      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            'relative z-10 flex-1 rounded-md text-center font-medium transition-colors duration-snap',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm',
            option.value === value ? 'text-text' : 'text-text-muted hover:text-text',
          )}
        >
          {option.label}
        </button>
      ))}
    </fieldset>
  );
}
