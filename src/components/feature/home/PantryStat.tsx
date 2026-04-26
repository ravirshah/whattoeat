import { cn } from '@/components/ui/utils';
import { AlertTriangleIcon, ShoppingBasketIcon } from 'lucide-react';
import Link from 'next/link';

interface PantryStatProps {
  itemCount: number;
}

const LOW_STOCK_THRESHOLD = 5;

export function PantryStat({ itemCount }: PantryStatProps) {
  const isLow = itemCount < LOW_STOCK_THRESHOLD;

  return (
    <Link
      href="/pantry"
      className={cn(
        'rounded-2xl border bg-card p-5 flex flex-col gap-3',
        'transition-colors duration-150 hover:bg-muted/50',
        isLow ? 'border-orange-200 dark:border-orange-900' : 'border-border',
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Pantry
        </p>
        {isLow ? (
          <AlertTriangleIcon className="w-4 h-4 text-orange-500" />
        ) : (
          <ShoppingBasketIcon className="w-4 h-4 text-muted-foreground" />
        )}
      </div>

      <div>
        <p className="text-3xl font-bold tabular-nums text-foreground">{itemCount}</p>
        <p className="text-sm text-muted-foreground">
          {itemCount === 1 ? 'item' : 'items'} in stock
        </p>
      </div>

      {isLow && (
        <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
          Running low &mdash; add more for better recommendations
        </p>
      )}
    </Link>
  );
}
