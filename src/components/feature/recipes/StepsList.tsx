'use client';

import { cn } from '@/components/ui/utils';
import type { Step } from '@/contracts/zod/recipe';
import { ClockIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface StepsListProps {
  steps: Step[];
}

interface TimerState {
  stepIdx: number;
  remainingSeconds: number;
  running: boolean;
}

export function StepsList({ steps }: StepsListProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [timer, setTimer] = useState<TimerState | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timer?.running) {
      intervalRef.current = setInterval(() => {
        setTimer((prev) => {
          if (!prev || prev.remainingSeconds <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return null;
          }
          return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timer?.running]);

  function startTimer(stepIdx: number, durationMin: number) {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimer({ stepIdx, remainingSeconds: durationMin * 60, running: true });
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  return (
    <ol className="flex flex-col gap-4">
      {steps.map((step, i) => {
        const isActive = activeStep === i;
        const timerForStep = timer?.stepIdx === step.idx ? timer : null;

        return (
          <li key={step.idx}>
            <button
              type="button"
              onClick={() => setActiveStep(i)}
              className={cn(
                'flex w-full gap-4 rounded-xl p-4 text-left transition-all duration-base',
                isActive ? 'bg-surface-elevated border border-border shadow-1' : 'hover:bg-surface',
              )}
            >
              {/* Step number badge */}
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors duration-snap',
                  isActive ? 'bg-accent text-accent-fg' : 'bg-surface-elevated text-text-muted',
                )}
              >
                {step.idx}
              </span>

              <div className="flex flex-1 flex-col gap-2">
                <p
                  className={cn(
                    'text-sm leading-relaxed',
                    isActive ? 'text-text' : 'text-text-muted',
                  )}
                >
                  {step.text}
                </p>

                {step.durationMin != null && step.durationMin > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      startTimer(step.idx, step.durationMin ?? 0);
                    }}
                    className="flex w-fit items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-text-muted hover:border-accent hover:text-accent transition-colors duration-snap"
                  >
                    <ClockIcon
                      strokeWidth={1.75}
                      className={cn(
                        'size-3.5 transition-all',
                        timerForStep?.running && 'text-accent animate-pulse',
                      )}
                    />
                    {timerForStep
                      ? formatTime(timerForStep.remainingSeconds)
                      : `${step.durationMin} min`}
                  </button>
                )}
              </div>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
