'use client';

import { cn } from '@/components/ui/utils';
import type { Step } from '@/contracts/zod/recipe';
import { CheckIcon, ClockIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

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
  const [done, setDone] = useState<Set<number>>(new Set());
  const [timer, setTimer] = useState<TimerState | null>(null);

  useEffect(() => {
    if (!timer?.running) return;
    // Capture stepIdx for the closure so a tick that arrives after the user
    // restarts the timer on another step doesn't clobber the new state.
    const stepIdx = timer.stepIdx;
    const id = setInterval(() => {
      setTimer((prev) => {
        if (!prev || prev.stepIdx !== stepIdx) return prev;
        if (prev.remainingSeconds <= 1) return null;
        return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timer?.running, timer?.stepIdx]);

  function startTimer(stepIdx: number, durationMin: number) {
    setTimer({ stepIdx, remainingSeconds: durationMin * 60, running: true });
  }

  function toggleDone(idx: number) {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  return (
    <ol className="flex flex-col gap-2.5">
      {steps.map((step, i) => {
        const isActive = activeStep === i;
        const isDone = done.has(i);
        const timerForStep = timer?.stepIdx === step.idx ? timer : null;

        return (
          <li
            key={step.idx}
            className={cn(
              'group rounded-2xl border transition-all duration-base',
              isActive && !isDone
                ? 'border-accent/40 bg-surface-elevated shadow-1 ring-1 ring-accent/20'
                : 'border-border bg-surface-elevated',
              isDone && 'opacity-60',
            )}
          >
            {/* biome-ignore lint/a11y/useSemanticElements: cannot use <button> here — it would nest the toggle-done <button> and timer <button> inside, which is invalid HTML and causes a hydration error. */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setActiveStep(i)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveStep(i);
                }
              }}
              className="flex items-start gap-3 p-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-2xl"
            >
              {/* Step number / done check */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleDone(i);
                }}
                aria-pressed={isDone}
                aria-label={
                  isDone ? `Mark step ${step.idx} not done` : `Mark step ${step.idx} done`
                }
                className={cn(
                  'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-all duration-snap',
                  isDone
                    ? 'bg-ok text-ok-fg'
                    : isActive
                      ? 'bg-accent text-accent-fg shadow-1'
                      : 'bg-surface text-text-muted hover:bg-surface-elevated hover:text-text',
                )}
              >
                {isDone ? <CheckIcon strokeWidth={3} className="size-4" /> : step.idx}
              </button>

              <div className="flex-1 text-left">
                <p
                  className={cn(
                    'text-sm leading-relaxed',
                    isActive && !isDone ? 'text-text' : 'text-text-muted',
                    isDone && 'line-through decoration-text-muted/40',
                  )}
                >
                  {step.text}
                </p>

                {step.durationMin != null && step.durationMin > 0 && (
                  <div className="mt-2.5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        startTimer(step.idx, step.durationMin ?? 0);
                      }}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors duration-snap',
                        timerForStep?.running
                          ? 'border-accent/60 bg-accent/10 text-accent'
                          : 'border-border bg-surface text-text-muted hover:border-accent/40 hover:text-accent',
                      )}
                    >
                      <ClockIcon
                        strokeWidth={2}
                        className={cn(
                          'size-3.5 transition-all',
                          timerForStep?.running && 'animate-pulse',
                        )}
                      />
                      <span className="font-mono tabular-nums">
                        {timerForStep
                          ? formatTime(timerForStep.remainingSeconds)
                          : `${step.durationMin} min`}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
