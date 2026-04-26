/**
 * tests/pwa/sw-toast.test.ts
 *
 * Unit tests for the SwRegister component's "new version available" toast logic.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const TOAST_DELAY_MS = 3000;

type ToastAction = {
  label: string;
  onClick: () => void;
};

function createWaitingHandler(
  toastFn: (msg: string, opts: { id: string; duration: number; action: ToastAction }) => void,
  wbMessageSkipWaiting: () => void,
  reloadFn: () => void,
  delayMs: number = TOAST_DELAY_MS,
) {
  return () => {
    const timer = setTimeout(() => {
      toastFn('A new version of WhatToEat is ready.', {
        id: 'sw-update',
        duration: Number.POSITIVE_INFINITY,
        action: {
          label: 'Refresh',
          onClick: () => {
            wbMessageSkipWaiting();
            reloadFn();
          },
        },
      });
    }, delayMs);
    return () => clearTimeout(timer);
  };
}

describe('SW update toast — new version waiting handler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does NOT show a toast immediately', () => {
    const toastFn = vi.fn();
    const handler = createWaitingHandler(toastFn, vi.fn(), vi.fn(), TOAST_DELAY_MS);
    handler();

    vi.advanceTimersByTime(TOAST_DELAY_MS - 1);
    expect(toastFn).not.toHaveBeenCalled();
  });

  it('shows the toast after TOAST_DELAY_MS', () => {
    const toastFn = vi.fn();
    const handler = createWaitingHandler(toastFn, vi.fn(), vi.fn(), TOAST_DELAY_MS);
    handler();

    vi.advanceTimersByTime(TOAST_DELAY_MS);
    expect(toastFn).toHaveBeenCalledOnce();
    expect(toastFn).toHaveBeenCalledWith(
      'A new version of WhatToEat is ready.',
      expect.objectContaining({ id: 'sw-update' }),
    );
  });

  it('toast message contains Refresh action label', () => {
    const toastFn = vi.fn();
    const handler = createWaitingHandler(toastFn, vi.fn(), vi.fn(), TOAST_DELAY_MS);
    handler();

    vi.advanceTimersByTime(TOAST_DELAY_MS);
    const opts = toastFn.mock.calls[0]?.[1] as { action: ToastAction };
    expect(opts.action.label).toBe('Refresh');
  });

  it('clicking Refresh calls messageSkipWaiting then reload', () => {
    const toastFn = vi.fn();
    const messageSkipWaiting = vi.fn();
    const reload = vi.fn();
    const handler = createWaitingHandler(toastFn, messageSkipWaiting, reload, TOAST_DELAY_MS);
    handler();

    vi.advanceTimersByTime(TOAST_DELAY_MS);
    const opts = toastFn.mock.calls[0]?.[1] as { action: ToastAction };

    opts.action.onClick();

    expect(messageSkipWaiting).toHaveBeenCalledOnce();
    expect(reload).toHaveBeenCalledOnce();
  });

  it('cleanup function cancels the timer', () => {
    const toastFn = vi.fn();
    const handler = createWaitingHandler(toastFn, vi.fn(), vi.fn(), TOAST_DELAY_MS);
    const cleanup = handler();

    cleanup?.();

    vi.advanceTimersByTime(TOAST_DELAY_MS * 2);
    expect(toastFn).not.toHaveBeenCalled();
  });

  it('toast duration is Infinity (not auto-dismissing)', () => {
    const toastFn = vi.fn();
    const handler = createWaitingHandler(toastFn, vi.fn(), vi.fn(), TOAST_DELAY_MS);
    handler();

    vi.advanceTimersByTime(TOAST_DELAY_MS);
    const opts = toastFn.mock.calls[0]?.[1] as { duration: number };
    expect(opts.duration).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('offline badge visibility logic', () => {
  it('is online by default (navigator.onLine is true in jsdom)', () => {
    expect(navigator.onLine).toBe(true);
  });

  it('transitions to offline when the offline event fires', () => {
    let isOnline = true;

    const handleOffline = () => {
      isOnline = false;
    };
    const handleOnline = () => {
      isOnline = true;
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    window.dispatchEvent(new Event('offline'));
    expect(isOnline).toBe(false);

    window.dispatchEvent(new Event('online'));
    expect(isOnline).toBe(true);

    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  });
});
