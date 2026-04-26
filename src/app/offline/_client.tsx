'use client';

import Link from 'next/link';

export function OfflinePageClient() {
  return (
    <main className="min-h-screen bg-surface flex flex-col items-center justify-center px-4 py-16">
      {/* Amber ring — mirrors MacroRing visual language */}
      <div className="relative flex items-center justify-center mb-8">
        <div className="w-32 h-32 rounded-full border-4 border-accent/20 flex items-center justify-center">
          <div className="w-24 h-24 rounded-full border-4 border-accent/50 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-accent"
                aria-hidden="true"
              >
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
                <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
                <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
                <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
                <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                <line x1="12" y1="20" x2="12.01" y2="20" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <h1 className="text-2xl font-semibold text-text text-center mb-2 tracking-tight">
        You&apos;re offline
      </h1>

      <p className="text-text-muted text-base text-center max-w-xs mb-2">
        WhatToEat can&apos;t reach the server right now. Check your connection and try again.
      </p>

      <p className="text-text-muted text-sm text-center max-w-xs mb-8">
        Your{' '}
        <Link
          href="/pantry"
          className="text-accent underline underline-offset-2 hover:text-accent-hover transition-colors duration-snap"
        >
          pantry
        </Link>{' '}
        is still available offline.
      </p>

      <button
        type="button"
        onClick={() => window.location.reload()}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-accent-fg text-sm font-medium
                   hover:bg-accent-hover active:scale-95 transition-all duration-snap focus-visible:outline-none
                   focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        Try again
      </button>
    </main>
  );
}
