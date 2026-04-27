import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KcalCircle } from '@/components/ui/macro-ring';
import { MealCard } from '@/components/ui/meal-card';
import { PantryChip } from '@/components/ui/pantry-chip';
import { Separator } from '@/components/ui/separator';
import { StatTile } from '@/components/ui/stat-tile';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { notFound } from 'next/navigation';
import { DarkModeToggle, SegmentedControlDemo } from './_client';

export default function PreviewPage() {
  if (process.env.NODE_ENV !== 'development') notFound();

  const swatches: { label: string; bg: string; text: string }[] = [
    { label: 'accent', bg: 'bg-accent', text: 'text-accent-fg' },
    { label: 'warm', bg: 'bg-warm', text: 'text-warm-fg' },
    { label: 'cool', bg: 'bg-cool', text: 'text-cool-fg' },
    { label: 'ok', bg: 'bg-ok', text: 'text-ok-fg' },
    { label: 'warn', bg: 'bg-warn', text: 'text-warn-fg' },
    { label: 'err', bg: 'bg-err', text: 'text-err-fg' },
    { label: 'cat-protein', bg: 'bg-cat-protein', text: 'text-surface' },
    { label: 'cat-produce', bg: 'bg-cat-produce', text: 'text-surface' },
    { label: 'cat-grain', bg: 'bg-cat-grain', text: 'text-surface' },
    { label: 'cat-dairy', bg: 'bg-cat-dairy', text: 'text-surface' },
    { label: 'cat-pantry', bg: 'bg-cat-pantry', text: 'text-surface' },
    { label: 'cat-other', bg: 'bg-cat-other', text: 'text-surface' },
  ];

  return (
    <div className="min-h-screen bg-surface px-6 py-12">
      <div className="mx-auto max-w-2xl flex flex-col gap-12">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-text">Design Preview</h1>
            <p className="mt-1 text-sm text-text-muted">
              Track 1 — token system + primitives smoke test
            </p>
          </div>
          <DarkModeToggle />
        </div>

        <Separator />

        {/* Typography */}
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Typography
          </h2>
          <h1 className="text-4xl font-bold tracking-tight text-text">Display heading</h1>
          <h2 className="text-2xl font-semibold text-text">Section heading</h2>
          <h3 className="text-lg font-medium text-text">Subsection</h3>
          <p className="text-base text-text">
            Body text — Geist Sans, reading content capped at 640px.
          </p>
          <p className="text-sm text-text-muted">Muted — secondary information.</p>
          <p className="font-mono text-sm text-text">Mono — 2,450 kcal · 187g P · 210g C · 82g F</p>
        </section>

        <Separator />

        {/* Buttons */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Buttons — variants
          </h2>
          <div className="flex flex-wrap gap-3">
            <Button variant="default">Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
          </div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Buttons — sizes
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
            <Button size="icon" aria-label="icon">
              +
            </Button>
            <Button size="icon-sm" aria-label="icon-sm">
              x
            </Button>
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
            <TabsContent value="saved">
              <p className="text-sm text-text-muted p-2">Saved recipes panel.</p>
            </TabsContent>
            <TabsContent value="cooked">
              <p className="text-sm text-text-muted p-2">Cooked log panel.</p>
            </TabsContent>
            <TabsContent value="history">
              <p className="text-sm text-text-muted p-2">Recommendation history panel.</p>
            </TabsContent>
          </Tabs>
        </section>

        <Separator />

        {/* SegmentedControl */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            SegmentedControl
          </h2>
          <SegmentedControlDemo />
        </section>

        <Separator />

        {/* Color swatches */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Token color swatches
          </h2>
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
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Shadows
          </h2>
          <div className="flex gap-6">
            <div className="rounded-xl bg-surface-elevated p-6 shadow-1 text-sm text-text-muted">
              shadow-1
            </div>
            <div className="rounded-xl bg-surface-elevated p-6 shadow-2 text-sm text-text-muted">
              shadow-2
            </div>
            <div className="rounded-xl bg-surface-elevated p-6 shadow-3 text-sm text-text-muted">
              shadow-3
            </div>
          </div>
        </section>

        <Separator />

        {/* PantryChip */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            PantryChip
          </h2>
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
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            StatTile
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Calories" value={2450} unit="kcal" tone="default" />
            <StatTile label="Protein" value={187} unit="g" tone="warm" />
            <StatTile label="Recovery" value={94} unit="HRV" tone="cool" />
            <StatTile label="Target hit" value="done" tone="ok" />
          </div>
        </section>

        <Separator />

        {/* KcalCircle */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            KcalCircle
          </h2>
          <div className="flex gap-6">
            <KcalCircle
              consumed={{ kcal: 1800, protein: 140, carbs: 180, fat: 60 }}
              target={{ kcal: 2450, protein: 187, carbs: 245, fat: 82 }}
              size={120}
            />
            <KcalCircle
              consumed={{ kcal: 2450, protein: 187, carbs: 245, fat: 82 }}
              target={{ kcal: 2450, protein: 187, carbs: 245, fat: 82 }}
              size={80}
            />
          </div>
        </section>

        <Separator />

        {/* MealCard */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            MealCard (stub)
          </h2>
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
  );
}
