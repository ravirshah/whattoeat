'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * InstallPrompt — listens for beforeinstallprompt and shows a small banner
 * with an "Add to home screen" CTA.
 *
 * Suppressed when:
 *   - Already running in standalone mode (already installed)
 *   - User previously dismissed (stored in sessionStorage)
 *   - Not in production
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Suppress if already running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    // Suppress if user already dismissed this session
    if (sessionStorage.getItem('pwa-install-dismissed') === '1') return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsVisible(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem('pwa-install-dismissed', '1');
  };

  if (!isVisible || !deferredPrompt) return null;

  return (
    <div
      role="banner"
      className="fixed bottom-16 left-4 right-4 z-50 flex items-center justify-between gap-3
                 px-4 py-3 rounded-xl bg-surface-elevated border border-border shadow-2
                 animate-in fade-in slide-in-from-bottom-2 duration-base sm:left-auto sm:right-4 sm:w-80"
    >
      <div className="flex items-center gap-3 min-w-0">
        <svg
          role="img"
          aria-label="Install"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          className="shrink-0 text-accent"
        >
          <path
            d="M12 2L12 14M12 2L8 6M12 2L16 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M4 14V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V14"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <div className="min-w-0">
          <p className="text-sm font-medium text-text truncate">Add to home screen</p>
          <p className="text-xs text-text-muted truncate">Install WhatToEat for quick access</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleInstall}
          className="px-3 py-1.5 rounded-lg bg-accent text-accent-fg text-xs font-medium
                     hover:bg-accent-hover transition-colors duration-snap focus-visible:outline-none
                     focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        >
          Install
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss install prompt"
          className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface transition-colors duration-snap
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M18 6L6 18M6 6L18 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
