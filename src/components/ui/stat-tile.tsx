import { cn } from '@/components/ui/utils';

type StatTone = 'default' | 'warm' | 'cool' | 'ok' | 'warn' | 'err';

interface StatTileProps {
  label: string;
  value: string | number;
  unit?: string;
  tone?: StatTone;
  className?: string;
}

const toneMap: Record<StatTone, string> = {
  default: 'bg-surface-elevated text-text',
  warm: 'bg-warm text-warm-fg',
  cool: 'bg-cool text-cool-fg',
  ok: 'bg-ok/15 text-ok',
  warn: 'bg-warn/15 text-warn-fg',
  err: 'bg-err/15 text-err',
};

/**
 * StatTile — number-first, mono numerals, label below.
 *
 * TODO: Plan 08 fills — real macro data, animated count-up.
 */
export function StatTile({ label, value, unit, tone = 'default', className }: StatTileProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-start gap-1 rounded-xl p-4 shadow-1',
        toneMap[tone],
        className,
      )}
    >
      <span className="font-mono text-2xl font-semibold leading-none tracking-tight">
        {value}
        {unit && <span className="ml-1 text-sm font-normal opacity-70">{unit}</span>}
      </span>
      <span className="text-xs font-medium opacity-70">{label}</span>
    </div>
  );
}
