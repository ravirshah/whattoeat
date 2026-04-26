// src/app/page.tsx
// Public landing page — rendered without auth gate, visible to all visitors.
// Server Component: no 'use client'. No data fetching needed.

import { Button } from '@/components/ui/button';
import { ArrowRightIcon, SparklesIcon } from 'lucide-react';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="relative min-h-dvh flex flex-col items-center justify-center overflow-hidden">
      {/* Animated gradient background */}
      <div
        className="absolute inset-0 -z-10 animate-gradient-shift"
        aria-hidden="true"
        style={{
          background:
            'linear-gradient(135deg, var(--background) 0%, color-mix(in srgb, var(--accent) 8%, transparent) 40%, var(--background) 70%, color-mix(in srgb, var(--muted) 30%, transparent) 100%)',
          backgroundSize: '400% 400%',
        }}
      />

      {/* Wordmark */}
      <header className="absolute top-6 left-1/2 -translate-x-1/2">
        <span className="text-lg font-semibold tracking-tight text-foreground">WhatToEat</span>
      </header>

      {/* Hero content */}
      <main className="flex flex-col items-center text-center px-6 gap-6 max-w-lg">
        {/* Eyebrow chip */}
        <div className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/5 px-3 py-1 text-xs font-medium text-accent">
          <SparklesIcon className="w-3 h-3" />
          AI-powered meal planning
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground leading-tight">
          Stop asking
          <br />
          <span className="text-accent">what to eat.</span>
        </h1>

        {/* Subheading */}
        <p className="text-base sm:text-lg text-muted-foreground max-w-sm leading-relaxed">
          WhatToEat learns your pantry, your macros, and your cravings — then gives you one perfect
          meal idea in seconds.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs sm:max-w-none sm:w-auto">
          <Button asChild size="lg" className="gap-2 text-base sm:px-8">
            <Link href="/auth/login">
              Get started free
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="text-base sm:px-8">
            <Link href="/auth/login">Sign in</Link>
          </Button>
        </div>

        {/* Social proof */}
        <p className="text-xs text-muted-foreground">
          No credit card needed &mdash; free during beta.
        </p>
      </main>

      {/* Feature tease footer */}
      <footer className="absolute bottom-8 left-0 right-0 flex justify-center gap-8 text-xs text-muted-foreground px-6">
        <span>Personalised macros</span>
        <span>Pantry-aware AI</span>
        <span>2-minute onboarding</span>
      </footer>
    </div>
  );
}
