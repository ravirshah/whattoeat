import { cn } from '@/components/ui/utils';
import type { LucideIcon, LucideProps } from 'lucide-react';

interface IconProps extends LucideProps {
  icon: LucideIcon;
}

/**
 * Thin wrapper around a Lucide icon that enforces strokeWidth=1.75
 * globally for visual consistency.
 *
 * Usage: <Icon icon={ChefHat} className="size-5 text-accent" />
 */
export function Icon({
  icon: LucideComponent,
  className,
  strokeWidth = 1.75,
  ...props
}: IconProps) {
  return (
    <LucideComponent strokeWidth={strokeWidth} className={cn('shrink-0', className)} {...props} />
  );
}
