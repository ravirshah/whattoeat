# Plan 01 — Design System

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete WhatToEat 2.0 design system — CSS token surface, Tailwind wiring, shadcn-forked primitives, feature component stubs, a no-raw-color guard, and a `/preview` dev route — so that every downstream feature track (Plans 03–12) has a consistent, typed, token-only component library to import from day one.

**Architecture:** All work lives in owned paths only. The token file (`src/styles/tokens.css`) is the single source of truth for every color, radius, shadow, and motion value. Tailwind reads from tokens via a `cssVar()` helper. Components use only Tailwind utility names — never raw hex, oklch, or inline styles. Dark mode is a token swap via `.dark` class on `<html>`.

**Tech Stack:** Next.js 15 (App Router), React 19, Tailwind CSS v3, `tailwindcss-animate`, `@fontsource/geist-sans`, `@fontsource/geist-mono`, Radix UI primitives (`@radix-ui/react-switch`, `@radix-ui/react-tabs`, `@radix-ui/react-tooltip`, `@radix-ui/react-popover`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-dialog`, `@radix-ui/react-separator`, `@radix-ui/react-label`), cmdk, vaul, sonner, clsx, tailwind-merge, cva (`class-variance-authority`), lucide-react, Vitest.

**Spec reference:** `docs/superpowers/specs/2026-04-26-whattoeat-2.0-design.md` — sections 5 (Design System & Frontend), 6 (Parallelization & Workflow), 7 (Skills/Tools).

**Prerequisites (manual, before Task 1):**
- Plan 00 is merged on `main`. Run `git pull origin main` to ensure you have contracts, schema, and the Plan 00 skeleton layout.
- Branch `wt/track-1-design-system` does not yet exist; Task 1 creates it.
- `bun` is installed.

---

## Shared-file rule (critical)

When adding deps, run `bun add <pkg>` and commit `package.json` + `bun.lock` in one focused commit at Task 1, then **do not edit `package.json` again** in any later task of this plan.

---

## Brand hue assumption

<!-- TODO: confirm with user -->
The spec describes a "primary brand hue" without specifying a hue value. This plan assumes: **near-black ink with warm-amber accent** (`--accent` ≈ amber 500, rgb triplet `217 119 6` in light mode). Warm palette leans amber/orange; cool palette leans slate-blue. Adjust the exact triplets in `src/styles/tokens.css` after running `/preview` if the palette feels off.

---

## File Structure

What this plan creates / modifies (relative to repo root):

```
package.json                                      # Task 1 only (add UI deps)
bun.lock                                          # Task 1 only

src/styles/tokens.css                             # Task 2 — full token surface
tailwind.config.ts                                # Task 3 — consumes tokens
postcss.config.mjs                                # Task 4 — tailwind + autoprefixer

src/app/globals.css                               # Task 5
src/app/layout.tsx                                # Task 6 — REPLACE Plan 00 skeleton

src/components/ui/utils.ts                        # Task 6 — cn() helper
src/components/ui/icon.tsx                        # Task 6 — <Icon> wrapper

src/components/ui/button.tsx                      # Task 7 — Group A
src/components/ui/input.tsx                       # Task 7
src/components/ui/label.tsx                       # Task 7
src/components/ui/separator.tsx                   # Task 7

src/components/ui/switch.tsx                      # Task 8 — Group B
src/components/ui/tabs.tsx                        # Task 8

src/components/ui/tooltip.tsx                     # Task 9 — Group C
src/components/ui/popover.tsx                     # Task 9
src/components/ui/dropdown-menu.tsx               # Task 9

src/components/ui/command.tsx                     # Task 10 — Group D
src/components/ui/dialog.tsx                      # Task 10
src/components/ui/sheet.tsx                       # Task 10
src/components/ui/drawer.tsx                      # Task 10

src/components/ui/toast.tsx                       # Task 11 — Group E
src/components/ui/segmented-control.tsx           # Task 11

src/components/ui/macro-ring.tsx                  # Task 12 — feature stubs
src/components/ui/pantry-chip.tsx                 # Task 12
src/components/ui/stat-tile.tsx                   # Task 12
src/components/ui/meal-card.tsx                   # Task 12
src/components/ui/checkin-sheet.tsx               # Task 12

src/styles/_no-raw-color.test.ts                  # Task 13 — guard

src/app/(dev)/preview/page.tsx                    # Task 14 — dev route
src/app/(dev)/preview/_client.tsx                 # Task 14 — interactive client pieces
```

**shadcn primitives are ours from day one — never re-pull from upstream.**

---

## Conventions used in this plan

- File paths are repo-relative; bash commands use the absolute path `/Users/ravishah/Documents/whattoeat`.
- `bun` is the package manager and runtime.
- All imports use the `@/` alias for `src/`.
- Every commit message follows `area: short imperative` (prefixes: `chore:`, `style:`, `ui:`).
- No raw hex, oklch, or inline color styles in any component file — Tailwind utility names only.
- `'use client'` at the top of any file that uses Radix primitives, React state, or browser APIs.
- All JSX uses literal `<` and `>` characters.

---

## Tasks

### Task 1: Create branch and add UI dependencies

**Files:** `package.json`, `bun.lock`

- [ ] **Step 1: Create and switch to feature branch**

```bash
cd /Users/ravishah/Documents/whattoeat
git checkout -b wt/track-1-design-system
```

- [ ] **Step 2: Add runtime UI dependencies**

```bash
cd /Users/ravishah/Documents/whattoeat
bun add \
  @radix-ui/react-switch \
  @radix-ui/react-tabs \
  @radix-ui/react-tooltip \
  @radix-ui/react-popover \
  @radix-ui/react-dropdown-menu \
  @radix-ui/react-dialog \
  @radix-ui/react-separator \
  @radix-ui/react-label \
  @radix-ui/react-slot \
  cmdk \
  vaul \
  sonner \
  clsx \
  tailwind-merge \
  class-variance-authority \
  lucide-react \
  @fontsource/geist-sans \
  @fontsource/geist-mono
```

- [ ] **Step 3: Add dev dependencies**

```bash
cd /Users/ravishah/Documents/whattoeat
bun add -d tailwindcss autoprefixer tailwindcss-animate
```

- [ ] **Step 4: Verify install**

```bash
cd /Users/ravishah/Documents/whattoeat
bun run typecheck 2>&1 | head -20
```

Expected: type errors only for files that don't exist yet (missing modules from later tasks). No bun install errors.

- [ ] **Step 5: Commit deps (ONLY commit this once — shared-file rule)**

```bash
cd /Users/ravishah/Documents/whattoeat
git add package.json bun.lock
git commit -m "chore: add design system deps (radix, tailwind, sonner, vaul, cmdk, cva)"
```

---

### Task 2: Token system — `src/styles/tokens.css`

**Files:** `src/styles/tokens.css`

The token file uses **rgb space-separated triplets** (e.g. `--surface: 255 255 255`) so Tailwind can compose `rgb(var(--token) / <alpha-value>)` for opacity utilities. Both `:root` (light) and `.dark` modes must hit WCAG AA contrast on text and interactive elements.

- [ ] **Step 1: Create styles directory**

```bash
mkdir -p /Users/ravishah/Documents/whattoeat/src/styles
```

- [ ] **Step 2: Write `src/styles/tokens.css`**

```css
/* src/styles/tokens.css
   Single source of truth for all design tokens.
   Values are rgb space-separated triplets so Tailwind can compose
   rgb(var(--token) / <alpha-value>) for opacity utilities.

   Brand assumption: near-black ink, warm-amber accent.
   <!-- TODO: confirm with user — swap --accent triplet if palette feels off -->
*/

:root {
  /* ── Surfaces ─────────────────────────────────────────────── */
  --surface:          255 255 255;   /* page bg */
  --surface-elevated: 249 249 249;   /* cards, panels */
  --surface-overlay:  255 255 255;   /* dialogs, sheets */

  /* ── Text ─────────────────────────────────────────────────── */
  --text:             15  15  15;    /* primary — near-black, WCAG AA on surface */
  --text-muted:       107 107 107;   /* secondary — 4.6:1 on white */
  --text-placeholder: 163 163 163;   /* inputs */

  /* ── Accent (warm amber) ──────────────────────────────────── */
  --accent:           217 119   6;   /* amber-600 */
  --accent-fg:        255 255 255;   /* text on accent bg */
  --accent-hover:     180  98   4;   /* darker amber for hover */

  /* ── Warm (energy / training-day surfaces) ────────────────── */
  --warm:             254 215 170;   /* orange-200 bg */
  --warm-fg:          154  52  18;   /* orange-800 text */
  --warm-subtle:      255 237 213;   /* orange-100 */

  /* ── Cool (recovery / rest-day surfaces) ─────────────────── */
  --cool:             186 230 253;   /* sky-200 bg */
  --cool-fg:           12  74 110;   /* sky-900 text */
  --cool-subtle:      224 242 254;   /* sky-100 */

  /* ── Status ───────────────────────────────────────────────── */
  --ok:               34 197  94;    /* green-500 */
  --ok-fg:           255 255 255;
  --warn:            234 179   8;    /* yellow-500 */
  --warn-fg:          66  32   6;    /* readable on warn */
  --err:             239  68  68;    /* red-500 */
  --err-fg:          255 255 255;

  /* ── Border & Ring ───────────────────────────────────────── */
  --border:           229 229 229;   /* neutral-200 */
  --ring:             217 119   6;   /* accent for focus rings */

  /* ── Category palette (6 colors) ─────────────────────────── */
  --cat-protein:      251 146  60;   /* orange-400 — meat/eggs */
  --cat-produce:       74 222 128;   /* green-400  — veg/fruit */
  --cat-grain:        251 191  36;   /* amber-400  — rice/pasta */
  --cat-dairy:        147 197 253;   /* blue-300   — milk/cheese */
  --cat-pantry:       216 180 254;   /* violet-300 — oils/spices */
  --cat-other:        156 163 175;   /* gray-400   — misc */

  /* ── Radius ───────────────────────────────────────────────── */
  --r-sm:   0.25rem;
  --r-md:   0.5rem;
  --r-lg:   0.75rem;
  --r-xl:   1rem;
  --r-2xl:  1.5rem;

  /* ── Shadows (soft, layered) ─────────────────────────────── */
  --shadow-1: 0 1px 2px rgb(0 0 0 / 0.04), 0 1px 3px rgb(0 0 0 / 0.06);
  --shadow-2: 0 2px 8px rgb(0 0 0 / 0.06), 0 4px 12px rgb(0 0 0 / 0.08);
  --shadow-3: 0 8px 24px rgb(0 0 0 / 0.08), 0 16px 40px rgb(0 0 0 / 0.10);

  /* ── Motion ──────────────────────────────────────────────── */
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-out:    cubic-bezier(0.16, 1, 0.3, 1);
  --dur-snap:    120ms;
  --dur-base:    240ms;
  --dur-expand:  360ms;
}

/* ── Dark mode token swap ─────────────────────────────────────
   Applied by adding class="dark" to <html>.
   Both modes hit WCAG AA contrast.
──────────────────────────────────────────────────────────────── */
.dark {
  /* Surfaces */
  --surface:          10  10  10;
  --surface-elevated: 20  20  20;
  --surface-overlay:  28  28  28;

  /* Text */
  --text:             242 242 242;
  --text-muted:       163 163 163;
  --text-placeholder:  82  82  82;

  /* Accent */
  --accent:           251 191  36;   /* amber-400 — brighter in dark */
  --accent-fg:         15  15  15;
  --accent-hover:     253 211  77;

  /* Warm */
  --warm:              67  20   7;   /* dark amber bg */
  --warm-fg:          253 186 116;   /* orange-300 text */
  --warm-subtle:       55  16   5;

  /* Cool */
  --cool:               7  37  61;   /* dark sky bg */
  --cool-fg:          125 211 252;   /* sky-300 text */
  --cool-subtle:        5  28  49;

  /* Status */
  --ok:               22 163  74;
  --ok-fg:           255 255 255;
  --warn:            202 138   4;
  --warn-fg:         255 255 255;
  --err:             220  38  38;
  --err-fg:          255 255 255;

  /* Border & Ring */
  --border:           38  38  38;
  --ring:            251 191  36;

  /* Category palette (slightly desaturated for dark mode harmony) */
  --cat-protein:      234 88   12;
  --cat-produce:      22 163  74;
  --cat-grain:       202 138   4;
  --cat-dairy:        59 130 246;
  --cat-pantry:      139  92 246;
  --cat-other:       107 114 128;

  /* Shadows — more pronounced in dark */
  --shadow-1: 0 1px 2px rgb(0 0 0 / 0.3), 0 1px 3px rgb(0 0 0 / 0.4);
  --shadow-2: 0 2px 8px rgb(0 0 0 / 0.35), 0 4px 12px rgb(0 0 0 / 0.4);
  --shadow-3: 0 8px 24px rgb(0 0 0 / 0.4), 0 16px 40px rgb(0 0 0 / 0.5);
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/ravishah/Documents/whattoeat
git add src/styles/tokens.css
git commit -m "style: add token surface (colors, radius, shadow, motion) in light + dark"
```

---

### Task 3: Tailwind configuration — `tailwind.config.ts`

**Files:** `tailwind.config.ts`

Uses a `cssVar()` helper to wrap tokens in `rgb(var(--token) / <alpha-value>)`. Maps every token to a Tailwind utility name.

- [ ] **Step 1: Write `tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

/** Wraps a CSS variable name so Tailwind can compose opacity modifiers.
 *  cssVar('surface') → 'rgb(var(--surface) / <alpha-value>)' */
function cssVar(name: string) {
  return `rgb(var(--${name}) / <alpha-value>)`
}

const config: Config = {
  darkMode: ['class'],

  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/styles/**/*.css',
  ],

  theme: {
    extend: {
      /* ── Font families ─────────────────────────────────── */
      fontFamily: {
        sans: ['Geist Sans', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'monospace'],
      },

      /* ── Colors (token-mapped) ─────────────────────────── */
      colors: {
        surface:          { DEFAULT: cssVar('surface'), elevated: cssVar('surface-elevated'), overlay: cssVar('surface-overlay') },
        text:             { DEFAULT: cssVar('text'),    muted: cssVar('text-muted'), placeholder: cssVar('text-placeholder') },
        accent:           { DEFAULT: cssVar('accent'),  fg: cssVar('accent-fg'),     hover: cssVar('accent-hover') },
        warm:             { DEFAULT: cssVar('warm'),    fg: cssVar('warm-fg'),        subtle: cssVar('warm-subtle') },
        cool:             { DEFAULT: cssVar('cool'),    fg: cssVar('cool-fg'),        subtle: cssVar('cool-subtle') },
        ok:               { DEFAULT: cssVar('ok'),      fg: cssVar('ok-fg') },
        warn:             { DEFAULT: cssVar('warn'),    fg: cssVar('warn-fg') },
        err:              { DEFAULT: cssVar('err'),     fg: cssVar('err-fg') },
        border:           cssVar('border'),
        ring:             cssVar('ring'),
        cat: {
          protein: cssVar('cat-protein'),
          produce: cssVar('cat-produce'),
          grain:   cssVar('cat-grain'),
          dairy:   cssVar('cat-dairy'),
          pantry:  cssVar('cat-pantry'),
          other:   cssVar('cat-other'),
        },
      },

      /* ── Border radius (token-mapped) ─────────────────── */
      borderRadius: {
        sm:  'var(--r-sm)',
        md:  'var(--r-md)',
        lg:  'var(--r-lg)',
        xl:  'var(--r-xl)',
        '2xl': 'var(--r-2xl)',
      },

      /* ── Box shadows (token-mapped) ───────────────────── */
      boxShadow: {
        1: 'var(--shadow-1)',
        2: 'var(--shadow-2)',
        3: 'var(--shadow-3)',
      },

      /* ── Transition timing ────────────────────────────── */
      transitionTimingFunction: {
        spring: 'var(--ease-spring)',
        out:    'var(--ease-out)',
      },
      transitionDuration: {
        snap:   'var(--dur-snap)',
        base:   'var(--dur-base)',
        expand: 'var(--dur-expand)',
      },

      /* ── Animation (tailwindcss-animate pass-through) ─── */
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up':   { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        'fade-in':        { from: { opacity: '0' }, to: { opacity: '1' } },
        'fade-out':       { from: { opacity: '1' }, to: { opacity: '0' } },
        'slide-in-from-bottom': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        'slide-out-to-bottom':  { from: { transform: 'translateY(0)' },    to: { transform: 'translateY(100%)' } },
      },
      animation: {
        'accordion-down': 'accordion-down var(--dur-base) var(--ease-out)',
        'accordion-up':   'accordion-up var(--dur-base) var(--ease-out)',
        'fade-in':        'fade-in var(--dur-base) var(--ease-out)',
        'fade-out':       'fade-out var(--dur-snap) var(--ease-out)',
        'slide-in':       'slide-in-from-bottom var(--dur-expand) var(--ease-spring)',
        'slide-out':      'slide-out-to-bottom var(--dur-base) var(--ease-out)',
      },
    },
  },

  plugins: [animate],
}

export default config
```

- [ ] **Step 2: Commit**

```bash
cd /Users/ravishah/Documents/whattoeat
git add tailwind.config.ts
git commit -m "style: tailwind config — token cssVar() wiring, dark mode class, animate plugin"
```

---

### Task 4: PostCSS config — `postcss.config.mjs`

**Files:** `postcss.config.mjs`

- [ ] **Step 1: Write `postcss.config.mjs`**

```js
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}

export default config
```

- [ ] **Step 2: Commit**

```bash
cd /Users/ravishah/Documents/whattoeat
git add postcss.config.mjs
git commit -m "chore: postcss — tailwindcss + autoprefixer"
```

---

### Task 5: Global CSS — `src/app/globals.css`

**Files:** `src/app/globals.css`

- [ ] **Step 1: Write `src/app/globals.css`**

```css
/* Tailwind directives */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Token surface — must come after @tailwind base so vars are available */
@import '../styles/tokens.css';

@layer base {
  *,
  *::before,
  *::after {
    border-color: rgb(var(--border));
    box-sizing: border-box;
  }

  html {
    font-family: 'Geist Sans', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }

  body {
    background-color: rgb(var(--surface));
    color: rgb(var(--text));
    min-height: 100dvh;
    line-height: 1.5;
  }

  /* Accessible focus rings — visible only on keyboard nav */
  :focus-visible {
    outline: 2px solid rgb(var(--ring));
    outline-offset: 2px;
  }

  /* Reduced motion — respect user preference */
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/ravishah/Documents/whattoeat
git add src/app/globals.css
git commit -m "style: globals.css — tailwind directives, token import, base layer resets"
```

---

### Task 6: Root layout, `cn()` helper, and `<Icon>` wrapper

**Files:** `src/app/layout.tsx`, `src/components/ui/utils.ts`, `src/components/ui/icon.tsx`

- [ ] **Step 1: Create ui directory**

```bash
mkdir -p /Users/ravishah/Documents/whattoeat/src/components/ui
```

- [ ] **Step 2: Write `src/components/ui/utils.ts`**

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge Tailwind classes without conflict. Safe to call with conditional objects. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 3: Write `src/components/ui/icon.tsx`**

```tsx
import type { LucideIcon, LucideProps } from 'lucide-react'
import { cn } from '@/components/ui/utils'

interface IconProps extends LucideProps {
  icon: LucideIcon
}

/**
 * Thin wrapper around a Lucide icon that enforces strokeWidth=1.75
 * globally for visual consistency.
 *
 * Usage: <Icon icon={ChefHat} className="size-5 text-accent" />
 */
export function Icon({ icon: LucideComponent, className, strokeWidth = 1.75, ...props }: IconProps) {
  return (
    <LucideComponent
      strokeWidth={strokeWidth}
      className={cn('shrink-0', className)}
      {...props}
    />
  )
}
```

- [ ] **Step 4: REPLACE `src/app/layout.tsx` (Plan 00 skeleton)**

This layout:
- Imports `globals.css` (which `@import`s tokens.css and runs `@tailwind base/components/utilities`).
- Loads Geist fonts via `@fontsource`.
- Mounts Sonner `<Toaster />`.
- Inlines a no-flash dark-mode init script that reads localStorage + matchMedia.
- Uses `<html lang="en" suppressHydrationWarning>`.

```tsx
import type { Metadata } from 'next'
import { Toaster } from 'sonner'

import '@fontsource/geist-sans/400.css'
import '@fontsource/geist-sans/500.css'
import '@fontsource/geist-sans/600.css'
import '@fontsource/geist-sans/700.css'
import '@fontsource/geist-mono/400.css'
import '@fontsource/geist-mono/600.css'

import '@/app/globals.css'

export const metadata: Metadata = {
  title: { default: 'WhatToEat', template: '%s — WhatToEat' },
  description: 'Personal meal-decision engine. Pantry + goals + daily check-in → what to eat.',
}

/** Inline script injected before React hydrates — prevents dark-mode flash.
 *  Reads localStorage key "theme"; falls back to system preference. */
const darkModeScript = `
(function(){
  try {
    var stored = localStorage.getItem('theme');
    if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  } catch(_) {}
})();
`.trim()

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: darkModeScript }} />
      </head>
      <body>
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            className: 'bg-surface-elevated text-text border border-border shadow-2',
          }}
        />
      </body>
    </html>
  )
}
```

- [ ] **Step 5: Commit**

```bash
cd /Users/ravishah/Documents/whattoeat
git add src/app/layout.tsx src/components/ui/utils.ts src/components/ui/icon.tsx
git commit -m "ui: root layout (fonts, dark-mode init, Toaster), cn() helper, Icon wrapper"
```

---

### Task 7: Primitives Group A — Button, Input, Label, Separator

**Files:** `src/components/ui/button.tsx`, `src/components/ui/input.tsx`, `src/components/ui/label.tsx`, `src/components/ui/separator.tsx`

**shadcn primitives are ours from day one — never re-pull from upstream.**

- [ ] **Step 1: Write `src/components/ui/button.tsx`**

```tsx
'use client'

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/components/ui/utils'

const buttonVariants = cva(
  // Base styles — applied to every variant
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium',
    'rounded-lg transition-all duration-snap ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-40',
    'select-none',
  ],
  {
    variants: {
      variant: {
        default:
          'bg-accent text-accent-fg hover:bg-accent-hover active:scale-[0.97]',
        secondary:
          'bg-surface-elevated text-text hover:bg-border active:scale-[0.97]',
        ghost:
          'text-text hover:bg-surface-elevated active:scale-[0.97]',
        destructive:
          'bg-err text-err-fg hover:opacity-90 active:scale-[0.97]',
        outline:
          'border border-border bg-transparent text-text hover:bg-surface-elevated active:scale-[0.97]',
        link:
          'text-accent underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        sm:      'h-8 px-3 text-xs',
        default: 'h-10 px-4 text-sm',
        lg:      'h-12 px-6 text-base',
        icon:    'h-10 w-10 p-0',
        'icon-sm': 'h-8 w-8 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render as child element (useful for wrapping <a> or Link) */
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
```

- [ ] **Step 2: Write `src/components/ui/input.tsx`**

```tsx
import * as React from 'react'
import { cn } from '@/components/ui/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          'flex h-10 w-full rounded-lg border border-border bg-surface-elevated px-3 py-2',
          'text-sm text-text placeholder:text-text-placeholder',
          'transition-colors duration-snap',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent',
          'disabled:cursor-not-allowed disabled:opacity-40',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          className
        )}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
```

- [ ] **Step 3: Write `src/components/ui/label.tsx`**

```tsx
'use client'

import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { cn } from '@/components/ui/utils'

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      'text-sm font-medium text-text leading-none',
      'peer-disabled:cursor-not-allowed peer-disabled:opacity-40',
      className
    )}
    {...props}
  />
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
```

- [ ] **Step 4: Write `src/components/ui/separator.tsx`**

```tsx
'use client'

import * as React from 'react'
import * as SeparatorPrimitive from '@radix-ui/react-separator'
import { cn } from '@/components/ui/utils'

const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(({ className, orientation = 'horizontal', decorative = true, ...props }, ref) => (
  <SeparatorPrimitive.Root
    ref={ref}
    decorative={decorative}
    orientation={orientation}
    className={cn(
      'shrink-0 bg-border',
      orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
      className
    )}
    {...props}
  />
))
Separator.displayName = SeparatorPrimitive.Root.displayName

export { Separator }
```

- [ ] **Step 5: Commit**

```bash
cd /Users/ravishah/Documents/whattoeat
git add src/components/ui/button.tsx src/components/ui/input.tsx \
        src/components/ui/label.tsx src/components/ui/separator.tsx
git commit -m "ui: Group A primitives — Button (cva variants), Input, Label, Separator"
```

---

### Task 8: Primitives Group B — Switch, Tabs

**Files:** `src/components/ui/switch.tsx`, `src/components/ui/tabs.tsx`

- [ ] **Step 1: Write `src/components/ui/switch.tsx`**

```tsx
'use client'

import * as React from 'react'
import * as SwitchPrimitive from '@radix-ui/react-switch'
import { cn } from '@/components/ui/utils'

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent',
      'transition-colors duration-snap ease-out',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      'disabled:cursor-not-allowed disabled:opacity-40',
      'data-[state=checked]:bg-accent data-[state=unchecked]:bg-border',
      className
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        'pointer-events-none block h-5 w-5 rounded-full bg-surface shadow-1',
        'transition-transform duration-snap ease-spring',
        'data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0'
      )}
    />
  </SwitchPrimitive.Root>
))
Switch.displayName = SwitchPrimitive.Root.displayName

export { Switch }
```

- [ ] **Step 2: Write `src/components/ui/tabs.tsx`**

```tsx
'use client'

import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '@/components/ui/utils'

const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex h-10 items-center justify-center rounded-lg bg-surface-elevated p-1 text-text-muted',
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium',
      'transition-all duration-snap ease-out',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      'disabled:pointer-events-none disabled:opacity-40',
      'data-[state=active]:bg-surface data-[state=active]:text-text data-[state=active]:shadow-1',
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
```

- [ ] **Step 3: Commit**

```bash
cd /Users/ravishah/Documents/whattoeat
git add src/components/ui/switch.tsx src/components/ui/tabs.tsx
git commit -m "ui: Group B primitives — Switch, Tabs"
```

---

### Task 9: Primitives Group C — Tooltip, Popover, DropdownMenu

**Files:** `src/components/ui/tooltip.tsx`, `src/components/ui/popover.tsx`, `src/components/ui/dropdown-menu.tsx`

- [ ] **Step 1: Write `src/components/ui/tooltip.tsx`**

```tsx
'use client'

import * as React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cn } from '@/components/ui/utils'

const TooltipProvider = TooltipPrimitive.Provider
const Tooltip = TooltipPrimitive.Root
const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 overflow-hidden rounded-md bg-text px-3 py-1.5 text-xs text-surface',
        'animate-fade-in shadow-2',
        className
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent }
```

- [ ] **Step 2: Write `src/components/ui/popover.tsx`**

```tsx
'use client'

import * as React from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { cn } from '@/components/ui/utils'

const Popover = PopoverPrimitive.Root
const PopoverTrigger = PopoverPrimitive.Trigger
const PopoverAnchor = PopoverPrimitive.Anchor

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = 'center', sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        'z-50 w-72 rounded-xl border border-border bg-surface-overlay p-4 shadow-2',
        'outline-none',
        'data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out',
        className
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverAnchor, PopoverContent }
```

- [ ] **Step 3: Write `src/components/ui/dropdown-menu.tsx`**

```tsx
'use client'

import * as React from 'react'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { CheckIcon, ChevronRightIcon, CircleIcon } from 'lucide-react'
import { cn } from '@/components/ui/utils'

const DropdownMenu = DropdownMenuPrimitive.Root
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger
const DropdownMenuGroup = DropdownMenuPrimitive.Group
const DropdownMenuPortal = DropdownMenuPrimitive.Portal
const DropdownMenuSub = DropdownMenuPrimitive.Sub
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup

const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & { inset?: boolean }
>(({ className, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      'flex cursor-default select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm',
      'outline-none focus:bg-surface-elevated data-[state=open]:bg-surface-elevated',
      inset && 'pl-8',
      className
    )}
    {...props}
  >
    {children}
    <ChevronRightIcon strokeWidth={1.75} className="ml-auto size-4" />
  </DropdownMenuPrimitive.SubTrigger>
))
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName

const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      'z-50 min-w-[8rem] overflow-hidden rounded-xl border border-border bg-surface-overlay p-1 shadow-2',
      'data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out',
      className
    )}
    {...props}
  />
))
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 min-w-[8rem] overflow-hidden rounded-xl border border-border bg-surface-overlay p-1 shadow-2',
        'data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out',
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
))
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex cursor-default select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm',
      'outline-none transition-colors duration-snap',
      'focus:bg-surface-elevated focus:text-text',
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-40',
      inset && 'pl-8',
      className
    )}
    {...props}
  />
))
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn('px-2 py-1.5 text-xs font-semibold text-text-muted', inset && 'pl-8', className)}
    {...props}
  />
))
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-border', className)}
    {...props}
  />
))
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName

const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      'relative flex cursor-default select-none items-center rounded-md py-1.5 pl-8 pr-2 text-sm',
      'outline-none transition-colors duration-snap',
      'focus:bg-surface-elevated focus:text-text',
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-40',
      className
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <CheckIcon strokeWidth={1.75} className="size-4" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
))
DropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName

const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      'relative flex cursor-default select-none items-center rounded-md py-1.5 pl-8 pr-2 text-sm',
      'outline-none transition-colors duration-snap',
      'focus:bg-surface-elevated focus:text-text',
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-40',
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <CircleIcon strokeWidth={1.75} className="size-2 fill-current" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
))
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName

export {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuCheckboxItem, DropdownMenuRadioItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuGroup, DropdownMenuPortal,
  DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/ravishah/Documents/whattoeat
git add src/components/ui/tooltip.tsx src/components/ui/popover.tsx \
        src/components/ui/dropdown-menu.tsx
git commit -m "ui: Group C primitives — Tooltip, Popover, DropdownMenu"
```

---

### Task 10: Primitives Group D — Command, Dialog, Sheet, Drawer

**Files:** `src/components/ui/command.tsx`, `src/components/ui/dialog.tsx`, `src/components/ui/sheet.tsx`, `src/components/ui/drawer.tsx`

- [ ] **Step 1: Write `src/components/ui/command.tsx`**

```tsx
'use client'

import * as React from 'react'
import { Command as CommandPrimitive } from 'cmdk'
import { SearchIcon } from 'lucide-react'
import { cn } from '@/components/ui/utils'

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn('flex h-full w-full flex-col overflow-hidden rounded-xl bg-surface-overlay', className)}
    {...props}
  />
))
Command.displayName = CommandPrimitive.displayName

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  <div className="flex items-center border-b border-border px-3" cmdk-input-wrapper="">
    <SearchIcon strokeWidth={1.75} className="mr-2 size-4 shrink-0 text-text-muted" />
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        'flex h-11 w-full bg-transparent py-3 text-sm text-text outline-none',
        'placeholder:text-text-placeholder disabled:cursor-not-allowed disabled:opacity-40',
        className
      )}
      {...props}
    />
  </div>
))
CommandInput.displayName = CommandPrimitive.Input.displayName

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn('max-h-[300px] overflow-y-auto overflow-x-hidden', className)}
    {...props}
  />
))
CommandList.displayName = CommandPrimitive.List.displayName

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
  <CommandPrimitive.Empty ref={ref} className="py-6 text-center text-sm text-text-muted" {...props} />
))
CommandEmpty.displayName = CommandPrimitive.Empty.displayName

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      'overflow-hidden p-1 text-text',
      '[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-text-muted',
      className
    )}
    {...props}
  />
))
CommandGroup.displayName = CommandPrimitive.Group.displayName

const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator ref={ref} className={cn('-mx-1 h-px bg-border', className)} {...props} />
))
CommandSeparator.displayName = CommandPrimitive.Separator.displayName

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex cursor-default select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none',
      'transition-colors duration-snap',
      'data-[selected=true]:bg-surface-elevated data-[selected=true]:text-text',
      'data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-40',
      className
    )}
    {...props}
  />
))
CommandItem.displayName = CommandPrimitive.Item.displayName

const CommandShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span className={cn('ml-auto text-xs tracking-widest text-text-muted', className)} {...props} />
)
CommandShortcut.displayName = 'CommandShortcut'

export {
  Command, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem, CommandSeparator, CommandShortcut,
}
```

- [ ] **Step 2: Write `src/components/ui/dialog.tsx`**

```tsx
'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { XIcon } from 'lucide-react'
import { cn } from '@/components/ui/utils'

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-text/30 backdrop-blur-sm',
      'data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out',
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2',
        'rounded-2xl border border-border bg-surface-overlay shadow-3 p-6',
        'data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out',
        'focus:outline-none',
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-md p-1 text-text-muted hover:text-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <XIcon strokeWidth={1.75} className="size-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col gap-1.5 text-center sm:text-left', className)} {...props} />
)
DialogHeader.displayName = 'DialogHeader'

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)} {...props} />
)
DialogFooter.displayName = 'DialogFooter'

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn('text-lg font-semibold text-text', className)} {...props} />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn('text-sm text-text-muted', className)} {...props} />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog, DialogPortal, DialogOverlay, DialogTrigger, DialogClose,
  DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
}
```

- [ ] **Step 3: Write `src/components/ui/sheet.tsx`** (vaul-backed bottom sheet)

```tsx
'use client'

import * as React from 'react'
import { Drawer as Vaul } from 'vaul'
import { cn } from '@/components/ui/utils'

/** Bottom sheet backed by vaul. Use for the daily check-in and similar tray-style surfaces. */
const Sheet = Vaul.Root
const SheetTrigger = Vaul.Trigger
const SheetClose = Vaul.Close
const SheetPortal = Vaul.Portal

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof Vaul.Overlay>,
  React.ComponentPropsWithoutRef<typeof Vaul.Overlay>
>(({ className, ...props }, ref) => (
  <Vaul.Overlay
    ref={ref}
    className={cn('fixed inset-0 z-50 bg-text/30 backdrop-blur-sm', className)}
    {...props}
  />
))
SheetOverlay.displayName = 'SheetOverlay'

const SheetContent = React.forwardRef<
  React.ElementRef<typeof Vaul.Content>,
  React.ComponentPropsWithoutRef<typeof Vaul.Content>
>(({ className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <Vaul.Content
      ref={ref}
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 mt-24 flex h-auto flex-col',
        'rounded-t-2xl border-t border-border bg-surface-overlay shadow-3',
        'focus:outline-none',
        className
      )}
      {...props}
    >
      {/* Drag handle */}
      <div className="mx-auto mt-4 h-1.5 w-12 rounded-full bg-border" />
      {children}
    </Vaul.Content>
  </SheetPortal>
))
SheetContent.displayName = 'SheetContent'

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col gap-1.5 px-6 pt-4 pb-2', className)} {...props} />
)
SheetHeader.displayName = 'SheetHeader'

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col gap-2 px-6 pb-8 pt-2', className)} {...props} />
)
SheetFooter.displayName = 'SheetFooter'

const SheetTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-lg font-semibold text-text', className)} {...props} />
  )
)
SheetTitle.displayName = 'SheetTitle'

const SheetDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm text-text-muted', className)} {...props} />
  )
)
SheetDescription.displayName = 'SheetDescription'

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription }
```

- [ ] **Step 4: Write `src/components/ui/drawer.tsx`** (vaul full drawer)

```tsx
'use client'

import * as React from 'react'
import { Drawer as Vaul } from 'vaul'
import { cn } from '@/components/ui/utils'

/** Full-height drawer (from left or right) backed by vaul. */
const Drawer = Vaul.Root
const DrawerTrigger = Vaul.Trigger
const DrawerClose = Vaul.Close
const DrawerPortal = Vaul.Portal

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof Vaul.Overlay>,
  React.ComponentPropsWithoutRef<typeof Vaul.Overlay>
>(({ className, ...props }, ref) => (
  <Vaul.Overlay
    ref={ref}
    className={cn('fixed inset-0 z-50 bg-text/30 backdrop-blur-sm', className)}
    {...props}
  />
))
DrawerOverlay.displayName = 'DrawerOverlay'

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof Vaul.Content>,
  React.ComponentPropsWithoutRef<typeof Vaul.Content>
>(({ className, children, ...props }, ref) => (
  <DrawerPortal>
    <DrawerOverlay />
    <Vaul.Content
      ref={ref}
      className={cn(
        'fixed inset-y-0 right-0 z-50 h-full w-full max-w-sm',
        'border-l border-border bg-surface-overlay shadow-3',
        'focus:outline-none',
        className
      )}
      {...props}
    >
      {children}
    </Vaul.Content>
  </DrawerPortal>
))
DrawerContent.displayName = 'DrawerContent'

const DrawerHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col gap-1.5 p-6', className)} {...props} />
)
DrawerHeader.displayName = 'DrawerHeader'

const DrawerFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('mt-auto flex flex-col gap-2 p-6', className)} {...props} />
)
DrawerFooter.displayName = 'DrawerFooter'

const DrawerTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-lg font-semibold text-text', className)} {...props} />
  )
)
DrawerTitle.displayName = 'DrawerTitle'

const DrawerDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm text-text-muted', className)} {...props} />
  )
)
DrawerDescription.displayName = 'DrawerDescription'

export { Drawer, DrawerTrigger, DrawerClose, DrawerContent, DrawerHeader, DrawerFooter, DrawerTitle, DrawerDescription }
```

- [ ] **Step 5: Commit**

```bash
cd /Users/ravishah/Documents/whattoeat
git add src/components/ui/command.tsx src/components/ui/dialog.tsx \
        src/components/ui/sheet.tsx src/components/ui/drawer.tsx
git commit -m "ui: Group D primitives — Command (cmdk), Dialog, Sheet + Drawer (vaul)"
```

---

### Task 11: Primitives Group E — Toast, SegmentedControl

**Files:** `src/components/ui/toast.tsx`, `src/components/ui/segmented-control.tsx`

- [ ] **Step 1: Write `src/components/ui/toast.tsx`**

```tsx
/**
 * Toast — thin re-export of sonner's `toast` function.
 * The <Toaster /> is already mounted in src/app/layout.tsx.
 *
 * Usage:
 *   import { toast } from '@/components/ui/toast'
 *   toast.success('Pantry updated')
 *   toast.error('Something went wrong')
 */
export { toast } from 'sonner'
```

- [ ] **Step 2: Write `src/components/ui/segmented-control.tsx`**

```tsx
'use client'

import * as React from 'react'
import { cn } from '@/components/ui/utils'

interface SegmentedControlProps<T extends string> {
  options: { label: string; value: T }[]
  value: T
  onChange: (value: T) => void
  className?: string
  size?: 'sm' | 'default'
}

/**
 * iOS-style segmented control. Pure client-side — no Radix dependency.
 * Used for Goal picker (cut/maintain/bulk), Training picker, etc.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  size = 'default',
}: SegmentedControlProps<T>) {
  const activeIndex = options.findIndex((o) => o.value === value)

  return (
    <div
      role="group"
      aria-label="Segmented control"
      className={cn(
        'relative inline-flex rounded-lg bg-surface-elevated p-1',
        className
      )}
    >
      {/* Sliding indicator */}
      {activeIndex >= 0 && (
        <span
          aria-hidden
          className="absolute top-1 bottom-1 rounded-md bg-surface shadow-1 transition-all duration-snap ease-spring"
          style={{
            width: `calc((100% - 0.5rem) / ${options.length})`,
            left: `calc(${activeIndex} * (100% - 0.5rem) / ${options.length} + 0.25rem)`,
          }}
        />
      )}

      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            'relative z-10 flex-1 rounded-md text-center font-medium transition-colors duration-snap',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm',
            option.value === value ? 'text-text' : 'text-text-muted hover:text-text'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/ravishah/Documents/whattoeat
git add src/components/ui/toast.tsx src/components/ui/segmented-control.tsx
git commit -m "ui: Group E — Toast (sonner re-export), SegmentedControl (iOS-style)"
```

---

### Task 12: Feature component stubs

**Files:** `src/components/ui/macro-ring.tsx`, `src/components/ui/pantry-chip.tsx`, `src/components/ui/stat-tile.tsx`, `src/components/ui/meal-card.tsx`, `src/components/ui/checkin-sheet.tsx`

Each stub renders a minimal token-styled placeholder so `/preview` doesn't throw. Downstream plans fill the real implementations.

- [ ] **Step 1: Write `src/components/ui/macro-ring.tsx`**

```tsx
import * as React from 'react'
import { cn } from '@/components/ui/utils'

interface Macros {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

interface MacroRingProps {
  consumed: Macros
  target: Macros
  size?: number
  className?: string
}

/**
 * MacroRing — Apple-Activity-style three-ring with gradient fills and
 * animated count-up numerals.
 *
 * TODO: Plan 08 fills this in — leave the stub.
 */
export function MacroRing({ consumed, target, size = 120, className }: MacroRingProps) {
  return (
    <div
      className={cn('flex flex-col items-center gap-2', className)}
      style={{ width: size, height: size }}
    >
      <div
        className="flex items-center justify-center rounded-full border-4 border-accent/30 bg-surface-elevated"
        style={{ width: size, height: size }}
      >
        <span className="font-mono text-sm font-semibold text-text-muted">
          {consumed.kcal}
          <span className="text-xs font-normal"> / {target.kcal}</span>
        </span>
      </div>
      <p className="text-xs text-text-muted">kcal</p>
    </div>
  )
}
```

- [ ] **Step 2: Write `src/components/ui/pantry-chip.tsx`**

```tsx
'use client'

import * as React from 'react'
import { XIcon } from 'lucide-react'
import { cn } from '@/components/ui/utils'

type PantryCategory = 'protein' | 'produce' | 'grain' | 'dairy' | 'pantry' | 'other'

interface PantryChipProps {
  name: string
  category: PantryCategory
  available: boolean
  onToggle?: () => void
  onRemove?: () => void
  className?: string
}

const categoryColorMap: Record<PantryCategory, string> = {
  protein: 'bg-cat-protein/20 text-cat-protein border-cat-protein/30',
  produce: 'bg-cat-produce/20 text-cat-produce border-cat-produce/30',
  grain:   'bg-cat-grain/20   text-cat-grain   border-cat-grain/30',
  dairy:   'bg-cat-dairy/20   text-cat-dairy   border-cat-dairy/30',
  pantry:  'bg-cat-pantry/20  text-cat-pantry  border-cat-pantry/30',
  other:   'bg-cat-other/20   text-cat-other   border-cat-other/30',
}

/**
 * PantryChip — togglable chip with category color and optional remove button.
 *
 * TODO: Plan 05 fills — real server action wiring, voice add, optimistic UI.
 */
export function PantryChip({ name, category, available, onToggle, onRemove, className }: PantryChipProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium',
        'cursor-pointer transition-all duration-snap select-none',
        categoryColorMap[category],
        !available && 'opacity-40',
        className
      )}
      role="checkbox"
      aria-checked={available}
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') onToggle?.() }}
    >
      <span>{name}</span>
      {onRemove && (
        <button
          type="button"
          aria-label={`Remove ${name}`}
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="rounded-full p-0.5 hover:bg-text/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <XIcon strokeWidth={1.75} className="size-3" />
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Write `src/components/ui/stat-tile.tsx`**

```tsx
import * as React from 'react'
import { cn } from '@/components/ui/utils'

type StatTone = 'default' | 'warm' | 'cool' | 'ok' | 'warn' | 'err'

interface StatTileProps {
  label: string
  value: string | number
  unit?: string
  tone?: StatTone
  className?: string
}

const toneMap: Record<StatTone, string> = {
  default: 'bg-surface-elevated text-text',
  warm:    'bg-warm text-warm-fg',
  cool:    'bg-cool text-cool-fg',
  ok:      'bg-ok/15 text-ok',
  warn:    'bg-warn/15 text-warn-fg',
  err:     'bg-err/15 text-err',
}

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
        className
      )}
    >
      <span className="font-mono text-2xl font-semibold leading-none tracking-tight">
        {value}
        {unit && <span className="ml-1 text-sm font-normal opacity-70">{unit}</span>}
      </span>
      <span className="text-xs font-medium opacity-70">{label}</span>
    </div>
  )
}
```

- [ ] **Step 4: Write `src/components/ui/meal-card.tsx`**

```tsx
import * as React from 'react'
import { ClockIcon, CheckCircleIcon } from 'lucide-react'
import { cn } from '@/components/ui/utils'

interface Macros {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

interface MealCardProps {
  title: string
  oneLineWhy: string
  estMacros: Macros
  totalMinutes: number
  pantryCoverage: number    // 0..1
  missingItems: string[]
  onPress?: () => void
  className?: string
}

/**
 * MealCard — recommendation centerpiece with title, why-line, macros, pantry
 * coverage chip, and time estimate.
 *
 * TODO: Plan 08 fills — streaming reveal animation, spring physics, full recipe tap.
 */
export function MealCard({
  title,
  oneLineWhy,
  estMacros,
  totalMinutes,
  pantryCoverage,
  missingItems,
  onPress,
  className,
}: MealCardProps) {
  const coveragePct = Math.round(pantryCoverage * 100)

  return (
    <div
      role={onPress ? 'button' : undefined}
      tabIndex={onPress ? 0 : undefined}
      onClick={onPress}
      onKeyDown={(e) => { if (onPress && (e.key === 'Enter' || e.key === ' ')) onPress() }}
      className={cn(
        'rounded-2xl border border-border bg-surface-elevated p-5 shadow-1',
        'flex flex-col gap-3',
        onPress && 'cursor-pointer transition-all duration-snap hover:shadow-2 active:scale-[0.98]',
        className
      )}
    >
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold text-text leading-snug">{title}</h3>
        <p className="text-sm text-text-muted">{oneLineWhy}</p>
      </div>

      <div className="flex items-center gap-3 text-xs text-text-muted">
        <span className="flex items-center gap-1">
          <ClockIcon strokeWidth={1.75} className="size-3.5" />
          {totalMinutes} min
        </span>
        <span className="flex items-center gap-1">
          <CheckCircleIcon strokeWidth={1.75} className="size-3.5 text-ok" />
          {coveragePct}% from pantry
        </span>
      </div>

      <div className="flex gap-4 font-mono text-xs text-text-muted">
        <span><strong className="text-text">{estMacros.kcal}</strong> kcal</span>
        <span><strong className="text-text">{estMacros.protein}g</strong> P</span>
        <span><strong className="text-text">{estMacros.carbs}g</strong> C</span>
        <span><strong className="text-text">{estMacros.fat}g</strong> F</span>
      </div>

      {missingItems.length > 0 && (
        <p className="text-xs text-text-muted">
          Need: {missingItems.slice(0, 3).join(', ')}{missingItems.length > 3 ? ` +${missingItems.length - 3} more` : ''}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Write `src/components/ui/checkin-sheet.tsx`**

```tsx
'use client'

import * as React from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'

interface ExistingCheckin {
  energy: number
  training: 'none' | 'light' | 'hard'
  hunger: 'low' | 'normal' | 'high'
  note?: string
}

interface CheckinSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingCheckin?: ExistingCheckin
}

/**
 * CheckinSheet — Vaul drawer for the 3-tap daily check-in.
 * Energy 1–5, training (none/light/hard), hunger (low/normal/high), optional note.
 *
 * TODO: Plan 07 fills — real server action, segmented controls, optimistic update.
 */
export function CheckinSheet({ open, onOpenChange, existingCheckin }: CheckinSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Daily Check-in</SheetTitle>
          <SheetDescription>
            3 taps, ~5 seconds. How are you feeling today?
          </SheetDescription>
        </SheetHeader>
        <div className="px-6 py-4 text-sm text-text-muted">
          {existingCheckin
            ? `Today logged: energy ${existingCheckin.energy}/5, training ${existingCheckin.training}, hunger ${existingCheckin.hunger}`
            : 'Check-in form — Plan 07 fills this in.'}
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 6: Commit**

```bash
cd /Users/ravishah/Documents/whattoeat
git add src/components/ui/macro-ring.tsx src/components/ui/pantry-chip.tsx \
        src/components/ui/stat-tile.tsx src/components/ui/meal-card.tsx \
        src/components/ui/checkin-sheet.tsx
git commit -m "ui: feature component stubs — MacroRing, PantryChip, StatTile, MealCard, CheckinSheet"
```

---

### Task 13: No-raw-color guard

**Files:** `src/styles/_no-raw-color.test.ts`

Vitest test that walks `src/components/**` and `src/app/**`, excluding `src/styles/tokens.css`, `tailwind.config.ts`, and the test file itself. Fails on bare hex or oklch patterns after stripping line comments.

- [ ] **Step 1: Write `src/styles/_no-raw-color.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { readdirSync, statSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = join(import.meta.dirname, '../..')

const EXCLUDED_FILES = new Set([
  'src/styles/tokens.css',
  'tailwind.config.ts',
  'src/styles/_no-raw-color.test.ts',
])

const SCAN_DIRS = ['src/components', 'src/app']

const HEX_RE = /#[0-9a-fA-F]{3,8}\b/
const OKLCH_RE = /oklch\s*\(/

function walkFiles(dir: string): string[] {
  const results: string[] = []
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return results
  }
  for (const entry of entries) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      results.push(...walkFiles(full))
    } else if (/\.(ts|tsx|css|js|jsx)$/.test(entry)) {
      results.push(full)
    }
  }
  return results
}

function stripLineComments(source: string): string {
  // Remove // single-line comments and /* block */ comments
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*/g, '')
}

describe('no-raw-color guard', () => {
  const files = SCAN_DIRS.flatMap((d) => walkFiles(join(ROOT, d))).filter((f) => {
    const rel = relative(ROOT, f).replace(/\\/g, '/')
    return !EXCLUDED_FILES.has(rel)
  })

  it('should have files to scan', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  for (const file of files) {
    const rel = relative(ROOT, file).replace(/\\/g, '/')
    it(`${rel} — no raw hex or oklch`, () => {
      const src = stripLineComments(readFileSync(file, 'utf8'))
      const hexMatch = src.match(HEX_RE)
      const oklchMatch = src.match(OKLCH_RE)
      expect(hexMatch, `Raw hex color found: ${hexMatch?.[0]}`).toBeNull()
      expect(oklchMatch, `Raw oklch() found in ${rel}`).toBeNull()
    })
  }
})
```

- [ ] **Step 2: Run the guard to confirm it passes on current stubs**

```bash
cd /Users/ravishah/Documents/whattoeat
bun run test --reporter=verbose 2>&1 | tail -30
```

Expected: all `_no-raw-color.test.ts` cases pass (no raw hex in our stubs). If a case fails, find and remove the raw color before committing.

- [ ] **Step 3: Commit**

```bash
cd /Users/ravishah/Documents/whattoeat
git add src/styles/_no-raw-color.test.ts
git commit -m "style: no-raw-color vitest guard — blocks hex and oklch in components"
```

---

### Task 14: Preview dev route — `/preview`

**Files:** `src/app/(dev)/preview/page.tsx`, `src/app/(dev)/preview/_client.tsx`

The server component guards itself to dev only. Interactive pieces (dark-mode toggle, SegmentedControl demo) live in a separate `_client.tsx` Client Component — do **not** inline `'use client'` inside a Server Component function body.

- [ ] **Step 1: Create directory**

```bash
mkdir -p /Users/ravishah/Documents/whattoeat/src/app/\(dev\)/preview
```

- [ ] **Step 2: Write `src/app/(dev)/preview/_client.tsx`**

```tsx
'use client'

import * as React from 'react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { SegmentedControl } from '@/components/ui/segmented-control'

export function DarkModeToggle() {
  const [dark, setDark] = React.useState(false)

  const toggle = (checked: boolean) => {
    setDark(checked)
    if (checked) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Switch id="dark-toggle" checked={dark} onCheckedChange={toggle} />
      <Label htmlFor="dark-toggle">Dark mode</Label>
    </div>
  )
}

export function SegmentedControlDemo() {
  type Goal = 'cut' | 'maintain' | 'bulk'
  const [goal, setGoal] = React.useState<Goal>('maintain')
  return (
    <div className="flex flex-col gap-2">
      <Label>Goal (SegmentedControl)</Label>
      <SegmentedControl
        options={[
          { label: 'Cut', value: 'cut' as Goal },
          { label: 'Maintain', value: 'maintain' as Goal },
          { label: 'Bulk', value: 'bulk' as Goal },
        ]}
        value={goal}
        onChange={setGoal}
      />
      <p className="text-xs text-text-muted">Selected: {goal}</p>
    </div>
  )
}
```

- [ ] **Step 3: Write `src/app/(dev)/preview/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PantryChip } from '@/components/ui/pantry-chip'
import { StatTile } from '@/components/ui/stat-tile'
import { MacroRing } from '@/components/ui/macro-ring'
import { MealCard } from '@/components/ui/meal-card'
import { DarkModeToggle, SegmentedControlDemo } from './_client'

export default function PreviewPage() {
  if (process.env.NODE_ENV !== 'development') notFound()

  const swatches: { label: string; bg: string; text: string }[] = [
    { label: 'accent',      bg: 'bg-accent',      text: 'text-accent-fg' },
    { label: 'warm',        bg: 'bg-warm',         text: 'text-warm-fg' },
    { label: 'cool',        bg: 'bg-cool',         text: 'text-cool-fg' },
    { label: 'ok',          bg: 'bg-ok',           text: 'text-ok-fg' },
    { label: 'warn',        bg: 'bg-warn',         text: 'text-warn-fg' },
    { label: 'err',         bg: 'bg-err',          text: 'text-err-fg' },
    { label: 'cat-protein', bg: 'bg-cat-protein',  text: 'text-surface' },
    { label: 'cat-produce', bg: 'bg-cat-produce',  text: 'text-surface' },
    { label: 'cat-grain',   bg: 'bg-cat-grain',    text: 'text-surface' },
    { label: 'cat-dairy',   bg: 'bg-cat-dairy',    text: 'text-surface' },
    { label: 'cat-pantry',  bg: 'bg-cat-pantry',   text: 'text-surface' },
    { label: 'cat-other',   bg: 'bg-cat-other',    text: 'text-surface' },
  ]

  return (
    <div className="min-h-screen bg-surface px-6 py-12">
      <div className="mx-auto max-w-2xl flex flex-col gap-12">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-text">Design Preview</h1>
            <p className="mt-1 text-sm text-text-muted">Track 1 — token system + primitives smoke test</p>
          </div>
          <DarkModeToggle />
        </div>

        <Separator />

        {/* Typography */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Typography</h2>
          <h1 className="text-4xl font-bold tracking-tight text-text">Display heading</h1>
          <h2 className="text-2xl font-semibold text-text">Section heading</h2>
          <h3 className="text-lg font-medium text-text">Subsection</h3>
          <p className="text-base text-text">Body text — Geist Sans, reading content capped at 640px.</p>
          <p className="text-sm text-text-muted">Muted — secondary information.</p>
          <p className="font-mono text-sm text-text">Mono — 2,450 kcal · 187g P · 210g C · 82g F</p>
        </section>

        <Separator />

        {/* Buttons */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Buttons — variants</h2>
          <div className="flex flex-wrap gap-3">
            <Button variant="default">Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
          </div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Buttons — sizes</h2>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
            <Button size="icon" aria-label="icon">+</Button>
            <Button size="icon-sm" aria-label="icon-sm">×</Button>
          </div>
          <div className="flex gap-3">
            <Button disabled>Disabled</Button>
          </div>
        </section>

        <Separator />

        {/* Form */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Form</h2>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="ravi@example.com" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="disabled-input">Disabled</Label>
            <Input id="disabled-input" disabled placeholder="Not editable" />
          </div>
        </section>

        <Separator />

        {/* Tabs */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Tabs</h2>
          <Tabs defaultValue="saved">
            <TabsList>
              <TabsTrigger value="saved">Saved</TabsTrigger>
              <TabsTrigger value="cooked">Cooked</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <TabsContent value="saved"><p className="text-sm text-text-muted p-2">Saved recipes panel.</p></TabsContent>
            <TabsContent value="cooked"><p className="text-sm text-text-muted p-2">Cooked log panel.</p></TabsContent>
            <TabsContent value="history"><p className="text-sm text-text-muted p-2">Recommendation history panel.</p></TabsContent>
          </Tabs>
        </section>

        <Separator />

        {/* SegmentedControl */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">SegmentedControl</h2>
          <SegmentedControlDemo />
        </section>

        <Separator />

        {/* Color swatches */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Token color swatches</h2>
          <div className="grid grid-cols-4 gap-3">
            {swatches.map((s) => (
              <div key={s.label} className={`${s.bg} ${s.text} rounded-xl p-3 shadow-1`}>
                <p className="text-xs font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        <Separator />

        {/* Shadows */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Shadows</h2>
          <div className="flex gap-6">
            <div className="rounded-xl bg-surface-elevated p-6 shadow-1 text-sm text-text-muted">shadow-1</div>
            <div className="rounded-xl bg-surface-elevated p-6 shadow-2 text-sm text-text-muted">shadow-2</div>
            <div className="rounded-xl bg-surface-elevated p-6 shadow-3 text-sm text-text-muted">shadow-3</div>
          </div>
        </section>

        <Separator />

        {/* PantryChip */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">PantryChip</h2>
          <div className="flex flex-wrap gap-2">
            <PantryChip name="Chicken breast" category="protein" available={true} />
            <PantryChip name="Spinach" category="produce" available={true} />
            <PantryChip name="Brown rice" category="grain" available={true} />
            <PantryChip name="Cheddar" category="dairy" available={false} />
            <PantryChip name="Olive oil" category="pantry" available={true} />
            <PantryChip name="Almonds" category="other" available={true} />
          </div>
        </section>

        <Separator />

        {/* StatTile grid */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">StatTile</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Calories" value={2450} unit="kcal" tone="default" />
            <StatTile label="Protein" value={187} unit="g" tone="warm" />
            <StatTile label="Recovery" value={94} unit="HRV" tone="cool" />
            <StatTile label="Target hit" value="✓" tone="ok" />
          </div>
        </section>

        <Separator />

        {/* MacroRing */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">MacroRing (stub)</h2>
          <div className="flex gap-6">
            <MacroRing
              consumed={{ kcal: 1800, protein: 140, carbs: 180, fat: 60 }}
              target={{ kcal: 2450, protein: 187, carbs: 245, fat: 82 }}
              size={120}
            />
            <MacroRing
              consumed={{ kcal: 2450, protein: 187, carbs: 245, fat: 82 }}
              target={{ kcal: 2450, protein: 187, carbs: 245, fat: 82 }}
              size={80}
            />
          </div>
        </section>

        <Separator />

        {/* MealCard */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">MealCard (stub)</h2>
          <MealCard
            title="Spiced Chicken & Rice Bowl"
            oneLineWhy="High-protein, uses 9 of 11 pantry items, ready in 25 min."
            estMacros={{ kcal: 620, protein: 48, carbs: 55, fat: 18 }}
            totalMinutes={25}
            pantryCoverage={0.82}
            missingItems={['lemon', 'fresh coriander']}
          />
          <MealCard
            title="Quick Egg & Spinach Scramble"
            oneLineWhy="Light, fast, perfect for low-hunger mornings."
            estMacros={{ kcal: 340, protein: 24, carbs: 8, fat: 22 }}
            totalMinutes={10}
            pantryCoverage={1}
            missingItems={[]}
          />
        </section>

        <Separator />

        <p className="text-xs text-text-muted text-center pb-8">
          /preview — development only · WhatToEat 2.0 Design System
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/ravishah/Documents/whattoeat
git add "src/app/(dev)/preview/page.tsx" "src/app/(dev)/preview/_client.tsx"
git commit -m "ui: /preview dev route — typography, buttons, form, tabs, swatches, feature stubs"
```

---

### Task 15: Final verification and PR

- [ ] **Step 1: Typecheck**

```bash
cd /Users/ravishah/Documents/whattoeat
bun run typecheck
```

Expected: zero errors. If errors appear, fix them before continuing.

- [ ] **Step 2: Lint**

```bash
cd /Users/ravishah/Documents/whattoeat
bun run lint
```

Expected: zero violations. Run `bun run lint:fix` if autofixable.

- [ ] **Step 3: Test suite**

```bash
cd /Users/ravishah/Documents/whattoeat
bun run test
```

Expected: all tests pass, including every case in `_no-raw-color.test.ts`.

- [ ] **Step 4: Manual smoke at `/preview`**

```bash
cd /Users/ravishah/Documents/whattoeat
bun run dev
```

Navigate to `http://localhost:3000/preview` and visually confirm:
- Typography, Buttons (all variants/sizes), Form, Tabs render correctly.
- SegmentedControl slider animates on click.
- DarkModeToggle switches the `.dark` class on `<html>` and all tokens swap.
- PantryChip, StatTile, MacroRing, MealCard stubs render without errors.
- Shadows visible.
- No flash of unstyled content on page load.

- [ ] **Step 5: Production build**

```bash
cd /Users/ravishah/Documents/whattoeat
NODE_ENV=production bun run build
```

Expected: exits zero. The `/preview` page hits `notFound()` in production — that's correct.

- [ ] **Step 6: Push and open PR**

```bash
cd /Users/ravishah/Documents/whattoeat
git push -u origin wt/track-1-design-system
gh pr create \
  --title "Track 1 — Design System: tokens, shadcn fork, primitives, stubs" \
  --body "$(cat <<'EOF'
## Summary

- **Token system** (`src/styles/tokens.css`): full CSS variable surface in `:root` and `.dark` — surfaces, text, accent, warm/cool, status, border/ring, 6-color category palette, radius, layered shadows, motion vars. RGB triplet format for Tailwind opacity composability.
- **Tailwind config** (`tailwind.config.ts`): `cssVar()` helper, all tokens mapped to Tailwind utility names, `darkMode: ['class']`, `tailwindcss-animate` plugin, Geist fonts.
- **Root layout** (`src/app/layout.tsx`): Geist fonts via @fontsource, Sonner Toaster, no-flash dark-mode init script.
- **Primitives** (`src/components/ui/`): `cn()` + `Icon` utilities; shadcn-forked Button (cva, 6 variants × 5 sizes), Input, Label, Separator, Switch, Tabs, Tooltip, Popover, DropdownMenu, Command (cmdk), Dialog, Sheet + Drawer (vaul), Toast (sonner re-export), SegmentedControl (iOS-style custom).
- **Feature stubs**: MacroRing, PantryChip, StatTile, MealCard, CheckinSheet — minimal token-styled placeholders for downstream tracks.
- **No-raw-color guard** (`src/styles/_no-raw-color.test.ts`): vitest walks `src/components/**` + `src/app/**`, fails on bare hex or oklch.
- **`/preview` route** (`src/app/(dev)/preview/`): full component gallery, dark-mode toggle, notFound() in production.

## Owned paths

`src/styles/**`, `tailwind.config.ts`, `postcss.config.mjs`, `src/components/ui/**`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/(dev)/**`

No edits to `src/server/**`, `src/db/**`, `src/engine/**`, `src/contracts/**`, or `src/app/page.tsx`.

## Test plan

- [ ] `bun run typecheck` — zero errors
- [ ] `bun run lint` — zero violations
- [ ] `bun run test` — all cases pass (no-raw-color guard)
- [ ] `bun run dev` → navigate to `/preview` — all sections render, dark toggle works, no FOUC
- [ ] `NODE_ENV=production bun run build` — exits zero
EOF
)"
```

---

## Definition of Done

- [ ] `bun run typecheck` exits zero
- [ ] `bun run lint` exits zero
- [ ] `bun run test` exits zero (all `_no-raw-color.test.ts` cases pass)
- [ ] `/preview` renders full gallery in dev — all primitive groups visible
- [ ] Dark-mode toggle switches token set; no flash on hard reload
- [ ] `NODE_ENV=production bun run build` exits zero
- [ ] No raw hex, oklch, or inline color styles in any file under `src/components/**` or `src/app/**` (excluding `tokens.css`, `tailwind.config.ts`, test file)
- [ ] No edits outside owned paths
- [ ] PR open and all CI checks green

## Hand-off

- **Plan 03 (Pantry)** is the first downstream consumer of this design system — it imports `PantryChip`, `Button`, `Input`, `Sheet`, `toast`, and `cn()` directly.
- **Plan 07 (Check-in)** fills in `checkin-sheet.tsx` with real server action wiring and segmented-control pickers.
- **Plan 08 (Feed Me / Recommendation UI)** fills in `macro-ring.tsx` (animated three-ring with gradient fills), `stat-tile.tsx` (live macro data), and `meal-card.tsx` (streaming reveal with spring physics).
