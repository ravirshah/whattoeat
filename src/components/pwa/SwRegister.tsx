'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

/**
 * SwRegister — mounts once in the root layout.
 *
 * Responsibilities:
 *   1. Register /sw.js via workbox-window in production.
 *   2. Listen for the 'waiting' lifecycle event (new SW installed, waiting to activate).
 *   3. Show a Sonner toast with a "Refresh" CTA when a new version is waiting.
 *   4. On "Refresh" click: post SKIP_WAITING to the waiting SW, then reload.
 *   5. Show a small offline indicator badge when navigator.onLine is false.
 *
 * Disabled in dev (process.env.NODE_ENV !== 'production') to avoid conflicts
 * with Next.js HMR. The SW file is not emitted in dev anyway.
 */

// Lazy type import — workbox-window is dynamically imported to keep it out of
// the SSR bundle, but we need the type for useRef.
// biome-ignore lint/suspicious/noExplicitAny: workbox-window type imported lazily
type WorkboxInstance = any;

const SW_PATH = '/sw.js';

// How long to wait before showing the update toast after detecting a waiting SW.
const TOAST_DELAY_MS = 3000;

function useServiceWorker() {
  const wbRef = useRef<WorkboxInstance>(null);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Offline/online status
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Only register the service worker in production.
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) {
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    let didCleanup = false;

    void (async () => {
      const { Workbox } = await import('workbox-window');
      if (didCleanup) return;

      const wb = new Workbox(SW_PATH);
      wbRef.current = wb;

      // 'waiting' fires when a new SW has installed but is blocked from activating.
      wb.addEventListener('waiting', () => {
        const toastTimer = setTimeout(() => {
          toast('A new version of WhatToEat is ready.', {
            id: 'sw-update',
            duration: Number.POSITIVE_INFINITY,
            action: {
              label: 'Refresh',
              onClick: () => {
                wb.messageSkipWaiting();
                window.location.reload();
              },
            },
          });
        }, TOAST_DELAY_MS);

        return () => clearTimeout(toastTimer);
      });

      // 'activated' fires when the SW takes control after install/update.
      wb.addEventListener('activated', (event: { isUpdate?: boolean }) => {
        if (!event.isUpdate) {
          return;
        }
        toast.dismiss('sw-update');
      });

      wb.addEventListener('controlling', () => {
        console.debug('[SW] Now controlling this page.');
      });

      await wb.register();
    })();

    return () => {
      didCleanup = true;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline };
}

export function SwRegister() {
  const { isOnline } = useServiceWorker();

  if (isOnline) return null;

  // Offline indicator badge — visible when the device is offline.
  return (
    <output
      aria-live="polite"
      aria-label="You are currently offline"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full
                 bg-err text-err-fg text-xs font-medium shadow-2
                 animate-in fade-in slide-in-from-bottom-2 duration-base"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-err-fg opacity-80" aria-hidden="true" />
      Offline
    </output>
  );
}
