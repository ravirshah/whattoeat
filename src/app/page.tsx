// src/app/page.tsx
// Public landing page — rendered without auth gate, visible to all visitors.
// Server Component. Responsive: mobile (stacked), desktop (multi-column).

import { Button } from '@/components/ui/button';
import { getUserId } from '@/server/auth';
import {
  ArrowRightIcon,
  ChefHatIcon,
  ClockIcon,
  HeartIcon,
  PackageIcon,
  SparklesIcon,
  TargetIcon,
  UtensilsIcon,
} from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function LandingPage() {
  // If already signed in, jump straight to the app — keeps the landing page
  // for visitors only, and avoids a "I just signed in but I'm still here" loop.
  const userId = await getUserId();
  if (userId) {
    redirect('/home');
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <SiteHeader />
      <Hero />
      <HowItWorks />
      <Features />
      <SignatureMoments />
      <FinalCta />
      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent/10 text-accent">
            <UtensilsIcon className="h-4 w-4" />
          </span>
          <span className="text-base font-semibold tracking-tight">WhatToEat</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
          <a href="#how" className="transition-colors hover:text-foreground">
            How it works
          </a>
          <a href="#features" className="transition-colors hover:text-foreground">
            Features
          </a>
          <Link href="/auth/login" className="transition-colors hover:text-foreground">
            Sign in
          </Link>
        </nav>
        <Button asChild size="sm" className="sm:hidden">
          <Link href="/auth/login">Sign in</Link>
        </Button>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 animate-gradient-shift"
        style={{
          background:
            'linear-gradient(135deg, var(--background) 0%, color-mix(in srgb, var(--accent) 8%, transparent) 40%, var(--background) 70%, color-mix(in srgb, var(--muted) 30%, transparent) 100%)',
          backgroundSize: '400% 400%',
        }}
      />

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:py-24">
        <div className="flex flex-col gap-6 text-center lg:text-left">
          <div className="inline-flex w-fit items-center gap-1.5 self-center rounded-full border border-accent/30 bg-accent/5 px-3 py-1 text-xs font-medium text-accent lg:self-start">
            <SparklesIcon className="h-3 w-3" />
            AI-powered meal planning
          </div>

          <h1 className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Stop asking
            <br />
            <span className="text-accent">what to eat.</span>
          </h1>

          <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg lg:max-w-md">
            WhatToEat learns your pantry, your macros, and how you feel today — then gives you one
            perfect meal idea in seconds. No more 7pm fridge-staring.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Button asChild size="lg" className="gap-2 text-base sm:px-8">
              <Link href="/auth/login">
                Get started free
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-base sm:px-8">
              <a href="#how">See how it works</a>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">No credit card needed — free during beta.</p>
        </div>

        <HeroPreview />
      </div>
    </section>
  );
}

function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none">
      <div className="rounded-3xl border border-border bg-card p-5 shadow-xl">
        <div className="mb-4 flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-accent/10 text-accent">
            <SparklesIcon className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Tonight&apos;s pick
            </p>
            <p className="text-sm font-medium">Based on your pantry + Tuesday energy</p>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl bg-surface-elevated p-4">
          <div>
            <p className="text-lg font-bold tracking-tight">Crispy harissa chickpea bowl</p>
            <p className="text-sm text-muted-foreground">22 min · 612 kcal · 38g protein</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {['high-protein', 'pantry-friendly', 'one-pan'].map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent"
              >
                {tag}
              </span>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              className="flex-1 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground"
            >
              Cook this
            </button>
            <button
              type="button"
              className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground"
            >
              Skip
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[
            { label: 'Protein', value: '38g' },
            { label: 'Carbs', value: '64g' },
            { label: 'Fat', value: '18g' },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-border py-2">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-sm font-bold tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div
        aria-hidden="true"
        className="absolute -right-3 -top-3 hidden h-20 w-20 rounded-full bg-accent/15 blur-2xl lg:block"
      />
    </div>
  );
}

function HowItWorks() {
  const steps = [
    {
      icon: TargetIcon,
      title: '1. Tell us your goal',
      body: '90-second onboarding. Share your goal, height, weight, and what you can’t eat. We compute your macro targets automatically.',
    },
    {
      icon: PackageIcon,
      title: '2. Stock your pantry',
      body: 'Type or scan what you have. We remember it. Your suggestions only use what you actually own.',
    },
    {
      icon: ChefHatIcon,
      title: '3. Tap Feed Me',
      body: 'One button, one meal idea. Tuned to your macros, your pantry, and how you logged today’s energy.',
    },
  ];

  return (
    <section id="how" className="border-t border-border/60 bg-surface-elevated/40 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent">
            How it works
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            From decision fatigue to dinner in three steps.
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {steps.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-lg"
            >
              <span className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mb-2 text-lg font-semibold tracking-tight">{title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const features = [
    {
      icon: TargetIcon,
      title: 'Personalised macros',
      body: 'Mifflin–St Jeor + activity multiplier. We compute kcal, protein, carbs, fat that fit your goal — and update them as you change.',
    },
    {
      icon: PackageIcon,
      title: 'Pantry-aware AI',
      body: 'Suggestions only use what you have. No more half-finished recipes. No more wasted groceries.',
    },
    {
      icon: HeartIcon,
      title: 'Allergen-safe by default',
      body: 'Tell us what you can’t eat once. We hard-filter every suggestion forever. No accidental peanuts, ever.',
    },
    {
      icon: ClockIcon,
      title: 'Daily check-in tunes the AI',
      body: '30 seconds to log energy, training, hunger. Tonight’s pick adapts: bigger plate after a hard session, lighter on rest days.',
    },
  ];

  return (
    <section id="features" className="py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent">
            Why it&apos;s different
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Built for the way you actually cook.
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            Not another recipe site. WhatToEat is a tiny daily habit that closes the loop between
            your pantry, your goals, and what ends up on your plate.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {features.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-3 flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent/10 text-accent">
                  <Icon className="h-4 w-4" />
                </span>
                <h3 className="text-base font-semibold tracking-tight">{title}</h3>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SignatureMoments() {
  return (
    <section className="border-t border-border/60 bg-surface-elevated/40 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent">
              Signature moment
            </p>
            <h2 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              One tap. One answer.
              <br />
              Zero spiral.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              The Feed Me button is the entire app distilled. Hit it from anywhere — home screen
              icon, lock screen, mid-yoga. We read your context and respond with one meal you can
              cook in under thirty minutes.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="gap-2">
                <Link href="/auth/login">
                  Try it free
                  <ArrowRightIcon className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-sm">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-xl">
              <Link
                href="/auth/login"
                className="feedme-shimmer flex w-full items-center justify-center gap-3 rounded-2xl bg-accent px-6 py-5 text-lg font-bold tracking-tight text-accent-foreground transition-transform duration-200 ease-out hover:scale-[1.02] active:scale-[0.98]"
              >
                <SparklesIcon className="h-5 w-5" />
                Feed Me
              </Link>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Powered by Gemini · Tuned to you
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Stop deciding. Start cooking.
        </h2>
        <p className="mt-4 text-base text-muted-foreground sm:text-lg">
          Two minutes to set up. Free during beta. Cancel anytime — there&apos;s nothing to cancel.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="gap-2 text-base sm:px-8">
            <Link href="/auth/login">
              Get started free
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="ghost" className="text-base">
            <a href="#how">See how it works</a>
          </Button>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border/60 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-xs text-muted-foreground sm:flex-row sm:px-6">
        <p>© {new Date().getFullYear()} WhatToEat. Built for cooks who&apos;d rather cook.</p>
        <div className="flex gap-6">
          <span>Personalised macros</span>
          <span>Pantry-aware</span>
          <span>2-minute setup</span>
        </div>
      </div>
    </footer>
  );
}
