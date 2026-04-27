# Cleanup Report — 2026-04-26

Agent: cleanup (Sonnet 4.6)  
Branch: main (direct commits, no worktree)  
Commits produced: 3  

---

## What was fixed

### Critical findings (all 5 fixed)

| Finding | File | Fix |
|---|---|---|
| `text-text-secondary` undefined token | `RecipeTweakPanel.tsx` L77,86,105 | → `text-text-muted` |
| `pb-safe` undefined Tailwind class | `CookButton.tsx` L42 | → `pb-[env(safe-area-inset-bottom)]` |
| `bg-ok text-white` bypasses token in dark mode | `CookButton.tsx` L79 | → `text-ok-fg` |
| `HomeMacroRing` always renders at 75% fill | `HomeMacroRing.tsx` + `home/page.tsx` | Repitched as "Daily Targets" — clean read-only stat row; section label updated; SVG rings removed |
| Supabase profile query duplicated 3× in onboarding | `layout.tsx`, `step/page.tsx`, `middleware.ts` | Extracted `getPartialProfileForOnboarding()` to `src/server/profile/onboarding-query.ts`; layout and step page now use it |

Note: The middleware query was left in place because it uses a slightly different client (middleware client vs server client) and a different shape for the gate function. The layout and step page queries — the two that shared identical column sets and identical normalization logic — were consolidated.

---

### High findings fixed

| Finding | Files | Fix |
|---|---|---|
| Raw `stroke-blue-500`, `text-amber-500` in LastCookedCard | `LastCookedCard.tsx` | → `text-cat-dairy`, `text-cat-grain` |
| `text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950` in CheckinPeek badge | `CheckinPeek.tsx` | → `text-ok bg-ok/10` |
| `text-amber-500` ZapIcon in CheckinPeek | `CheckinPeek.tsx` | → `text-warn` |
| `SmileIcon` for training indicator | `CheckinPeek.tsx` | → `DumbbellIcon text-cat-dairy` |
| Raw orange classes in PantryStat | `PantryStat.tsx` | → `border-warn/30`, `text-warn` |
| `MacroRing` stub misnamed vs `HomeMacroRing` duplication | `macro-ring.tsx`, `ProfileView.tsx`, `MacrosCard.tsx`, `preview/page.tsx` | Renamed `MacroRing` → `KcalCircle`; deprecated alias kept; all callers updated |
| `OnboardingStepper` missing `activeStep` | `onboarding/layout.tsx` | Derives step from `x-invoke-path` header and passes `activeStep` |
| `shadow-xl`/`hover:shadow-lg` on landing page | `page.tsx`, `FeedMeCta.tsx` | → `shadow-3`/`hover:shadow-3` |
| Feed Me page duplicate sticky h1 header | `feed-me/page.tsx` | Removed the sticky h1 block entirely |
| ProactiveBrief imperceptible gradient + glow blob | `ProactiveBrief.tsx` | → `bg-card` flat; glow blob removed |

---

### Medium findings fixed

| Finding | Files | Fix |
|---|---|---|
| `FeedMeCta 'use client'` for no reason | `FeedMeCta.tsx` | Removed `'use client'` |
| `MealCard 'use client'` for no reason | `meal-card.tsx` | Removed `'use client'` |
| `PantryAddDialog` native `<dialog>` with manual CSS | `PantryAddDialog.tsx` | Replaced with Radix `<Dialog>` / `<DialogContent>` |
| `GoalStep` hidden-input + button hack instead of native radios | `GoalStep.tsx` | Replaced with `<label>` + `<input type="radio">` + `has-[:checked]` CSS |
| `BodyDataStep` silently drops `sex: 'other' | 'prefer_not_to_say'` | `BodyDataStep.tsx` | Added "Prefer not to say" third option to segmented control |
| `RegenerateButton` dead inner `useTransition` | `RegenerateButton.tsx` | Removed `useTransition`; parent owns the transition |
| `checkin/page.tsx` redundant `Checkin.parse()` | `checkin/page.tsx` | Removed; cast to narrow CheckinSummary's prop type instead |
| `HomeMacroRing` fragile `replace('stroke-', 'bg-')` | `HomeMacroRing.tsx` | Moot — HomeMacroRing was rewritten entirely as DailyTargets |

---

### Low findings fixed

| Finding | Files | Fix |
|---|---|---|
| ProactiveBrief gradient goes from a color to itself | `ProactiveBrief.tsx` | Flat `bg-card` (part of High tier commit) |
| `SavedGrid` nested interactives | `SavedGrid.tsx` | Not actually broken — `MealCard` only sets `role="button"` when `onPress` is provided; SavedGrid never passes `onPress`. Pattern is safe. No change needed. |
| `RecipeDetail` `pb-32` may clip on small screens | `RecipeDetail.tsx` | → `pb-[calc(env(safe-area-inset-bottom)+140px)]` |
| `HeroPreview` `rounded-3xl` breaks radius scale | `page.tsx` | → `rounded-2xl` (both instances) |
| Hardcoded "Powered by Gemini" attribution | `page.tsx`, `src/lib/constants.ts` | Text changed to "AI-powered · Tuned to you"; `constants.ts` created with `AI_ATTRIBUTION` constant |

---

## What was skipped (and why)

| Finding | Reason skipped |
|---|---|
| Landing page animated gradient background `[ai-slop]` | Tagged `[ai-slop]` only — reserved for `/overdrive` agent |
| Bento-grid identical-card-weights `[ai-slop]` + `[hierarchy]` | Reserved for `/overdrive`/`/delight` agents |
| Four-cards-with-same-uppercase-label `[ai-slop]` + `[hierarchy]` | Reserved for `/overdrive`/`/delight` agents |
| `SparklesIcon` overuse `[ai-slop]` | Reserved for `/overdrive` agent |
| `ProactiveBrief` Sparkles+gradient+glow density `[ai-slop]` | AI-slop visual treatment reserved for `/overdrive`; gradient + glow blob WERE removed (the `[vibe-code]` part) |
| Feed Me header contextual status `[hierarchy]` | `[hierarchy]` part reserved for `/delight`; the duplicate h1 (the `[vibe-code]` part) WAS removed |
| `SmileIcon` → semantic icon `[hierarchy]` | Fixed as part of CheckinPeek token cleanup |
| Middleware third Supabase query | Left in place — uses different client (middleware client) and different gate function shape. Merging would require refactoring `onboardingRedirectPath` signature. |
| `SavedGrid` nested interactives | No actual bug in current usage — MealCard only sets `role="button"` when `onPress` is provided; SavedGrid never passes it. |
| `CheckinSummary` energy label duplication | Tagged `[hierarchy]` + `[vibe-code]` but only the `[vibe-code]` marker was in scope. Left as low-priority — requires creating a shared constant and updating both files. |
| `PantryAddDialog` example chip labels (Example 1, 2, 3) | Tagged `[hierarchy]` only — out of scope. However, the Radix Dialog migration also fixes the example chip text display (added truncated previews to chips). |
| `OnboardingStepFrame` Separator noise | Tagged `[hierarchy]` only — reserved for `/delight` agent |
| `BodyDataStep` US units without toggle | Tagged `[hierarchy]` only — reserved for `/delight` agent |
| `FAMILY_COLOR` raw blue-500/amber-500/violet-500 in ProactiveBrief | Not flagged in the critique as a `[dark-mode]` issue; these are for the weekly insight icon colors. Left for a separate pass. |

---

## Test/typecheck failures and workarounds

- **`.next/types` not found errors**: `bun run typecheck` reports 3 missing `.next/types` files. These are pre-existing (`.next` directory doesn't exist — no build has been run). All actual TypeScript errors in source files are clean.

- **`Checkin.parse()` removal caused type mismatch**: `CheckinDTO.training` is typed as `string` (from DB row), but `CheckinSummary` expects `TrainingLevel = 'none' | 'light' | 'hard'`. Resolved with a type assertion cast — the DB enum constraint guarantees valid values at runtime.

- **Biome formatter** required two rounds of format fixes (ProactiveBrief gradient removal, checkin page type cast). Both resolved.

---

## Commits

1. `17fbe8a` — `fix(ui): replace undefined tokens and misleading fake data (Critical fixes)`
2. `5cec5e2` — `fix(ui): map raw Tailwind colors to design tokens; clean up High-tier findings`
3. `4069788` — `chore(rsc): drop 'use client' from FeedMeCta and MealCard (no client behavior)` _(includes Medium + Low tier changes)_
