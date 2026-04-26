'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const SW_PATH = '/sw.js';

function showUpdateToast(reg: ServiceWorkerRegistration) {
  toast('A new version of WhatToEat is ready.', {
    id: 'sw-update',
    duration: Number.POSITIVE_INFINITY,
    action: {
      label: 'Refresh',
      onClick: () => {
        reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
      },
    },
  });
}

function useServiceWorker() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) {
      return () => {
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
      };
    }

    let cancelled = false;
    void (async () => {
      try {
        const reg = await navigator.serviceWorker.register(SW_PATH, { scope: '/' });
        if (cancelled) return;

        if (reg.waiting) showUpdateToast(reg);

        reg.addEventListener('updatefound', () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateToast(reg);
            }
          });
        });

        navigator.serviceWorker.addEventListener('controllerchange', () => {
          toast.dismiss('sw-update');
        });
      } catch (err) {
        console.warn('[SW] registration failed:', err);
      }
    })();

    return () => {
      cancelled = true;
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return { isOnline };
}

export function SwRegister() {
  const { isOnline } = useServiceWorker();

  if (isOnline) return null;

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
