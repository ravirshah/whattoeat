'use client';

import { cn } from '@/components/ui/utils';
import { CheckCircleIcon, ClockIcon } from 'lucide-react';

interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface MealCardProps {
  title: string;
  oneLineWhy: string;
  estMacros: Macros;
  totalMinutes: number;
  pantryCoverage: number; // 0..1
  missingItems: string[];
  onPress?: () => void;
  className?: string;
}

/**
 * MealCard — recommendation centerpiece with title, why-line, macros, pantry
 * coverage chip, and time estimate.
 *
 * TODO: Plan 08 fills — streaming reveal animation, spring physics, full recipe tap.
 */
export function MealCard({
  title,
  oneLineWhy,
  estMacros,
  totalMinutes,
  pantryCoverage,
  missingItems,
  onPress,
  className,
}: MealCardProps) {
  const coveragePct = Math.round(pantryCoverage * 100);

  return (
    <div
      role={onPress ? 'button' : undefined}
      tabIndex={onPress ? 0 : undefined}
      onClick={onPress}
      onKeyDown={(e) => {
        if (onPress && (e.key === 'Enter' || e.key === ' ')) onPress();
      }}
      className={cn(
        'rounded-2xl border border-border bg-surface-elevated p-5 shadow-1',
        'flex flex-col gap-3',
        onPress && 'cursor-pointer transition-all duration-snap hover:shadow-2 active:scale-[0.98]',
        className,
      )}
    >
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold text-text leading-snug">{title}</h3>
        <p className="text-sm text-text-muted">{oneLineWhy}</p>
      </div>

      <div className="flex items-center gap-3 text-xs text-text-muted">
        <span className="flex items-center gap-1">
          <ClockIcon strokeWidth={1.75} className="size-3.5" />
          {totalMinutes} min
        </span>
        <span className="flex items-center gap-1">
          <CheckCircleIcon strokeWidth={1.75} className="size-3.5 text-ok" />
          {coveragePct}% from pantry
        </span>
      </div>

      <div className="flex gap-4 font-mono text-xs text-text-muted">
        <span>
          <strong className="text-text">{estMacros.kcal}</strong> kcal
        </span>
        <span>
          <strong className="text-text">{estMacros.protein}g</strong> P
        </span>
        <span>
          <strong className="text-text">{estMacros.carbs}g</strong> C
        </span>
        <span>
          <strong className="text-text">{estMacros.fat}g</strong> F
        </span>
      </div>

      {missingItems.length > 0 && (
        <p className="text-xs text-text-muted">
          Need: {missingItems.slice(0, 3).join(', ')}
          {missingItems.length > 3 ? ` +${missingItems.length - 3} more` : ''}
        </p>
      )}
    </div>
  );
}
