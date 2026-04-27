# Critique Findings — 2026-04-26

---

## Critical (ship-blockers)

---

**`text-text-secondary` is an undefined token used in three places** at `src/components/feature/feed-me/RecipeTweakPanel.tsx:77,86,105`
- The token `text-text-secondary` does not exist in `tokens.css` or `tailwind.config.ts`. Tailwind will silently produce no output; the text will render in the wrong inherited color. In dark mode it is likely unreadable. Three class strings all reference it: the applied-tweak chip labels, the revert link, and the quick-tweak chip text.
- Replace with `text-text-muted` (the correct mid-weight token) or define the token in `tailwind.config.ts` if a distinct secondary tier is genuinely required.
- Tag: `[dark-mode]` `[anti-pattern]`

---

**`pb-safe` is an undefined Tailwind class** at `src/components/feature/recipes/CookButton.tsx:42`
- `pb-safe` resolves to nothing. On iPhone the sticky "Cook this" bar clips its bottom edge into the home indicator. The adjacent AppShell correctly uses `pb-[env(safe-area-inset-bottom)]`; this component doesn't.
- Replace with `pb-[env(safe-area-inset-bottom)]` to match the rest of the codebase.
- Tag: `[vibe-code]` `[dark-mode]`

---

**`HomeMacroRing` always renders arcs at 75% fill regardless of real data** at `src/components/feature/home/HomeMacroRing.tsx:70-93`
- The ring is advertised as "Today's macros" but all three arcs are hardcoded to `circumference * 0.75` and all `consumed` values are `0`. The section heading promises data; the component delivers decoration. Users who notice will distrust the whole product. This is the home page's most-glanced surface.
- Either wire real consumed data or repitch the section as a "Daily targets" reference (matching what ProfileView already calls it) and drop the SVG ring in favour of a simpler read-only stat layout until consumption tracking is built.
- Tag: `[hierarchy]` `[anti-pattern]`

---

**Direct Supabase query against `profiles` duplicated three times in onboarding** at `src/app/onboarding/layout.tsx:20-43`, `src/app/onboarding/step/[step]/page.tsx:28-53`, and `src/middleware.ts:52`
- The raw `supabase.from('profiles').select(...)` + manual coercion to `Partial<Profile>` is copy-pasted across layout, step page, and middleware. If the schema changes (column rename, new field), all three diverge silently. The codebase already has `getMyProfile()` in `src/server/profile/actions.ts`.
- Extract a server-side `getPartialProfileForOnboarding(userId, supabase)` function in `src/server/profile/` and use it in all three call sites.
- Tag: `[anti-pattern]` `[vibe-code]`

---

**`bg-ok text-white` in `CookButton` bypasses the token system** at `src/components/feature/recipes/CookButton.tsx:79`
- `text-white` is a raw color value; the correct paired token is `text-ok-fg` which in dark mode resolves to near-black for contrast. The cooked-state button will fail WCAG AA in dark mode.
- Replace `text-white` with `text-ok-fg`.
- Tag: `[dark-mode]` `[anti-pattern]`

---

## High (visible to users; fix this week)

---

**"Today's Brief" card is textbook AI slop: SparklesIcon + "TODAY'S BRIEF" uppercase label + gradient + glow blob** at `src/components/feature/home/ProactiveBrief.tsx:139-155`
- The `bg-gradient-to-br from-surface-elevated via-card to-card` gradient (two tokens that resolve to nearly the same shade) produces a visual tell with zero payoff. The absolute `blur-2xl` circle in the corner (`-top-12 -right-12 h-40 w-40 bg-accent/10 blur-2xl`) is the canonical 2024 AI UI glow orb. The `SparklesIcon` + all-caps `TRACKING-[0.14em]` label overhead is the single most recognisable AI-generated pattern. All three on one card is maximum slop density.
- Remove the gradient (use flat `bg-card`), remove the glow blob entirely, replace the Sparkles+uppercase label combo with a typographic treatment (e.g., contextual greeting text as the section anchor with no decorative icon above it).
- Tag: `[ai-slop]`

---

**Landing page hero uses an animated shifting gradient background** at `src/app/page.tsx:73-82`
- The hero background is a `linear-gradient` with animated `background-position` via `animate-gradient-shift`. This is a flagship AI-template tell — seen in thousands of Vercel-template launches. It moves behind content for no semantic reason.
- Replace with a static, intentional background treatment or no background at all. The copy is strong enough to stand without the animation.
- Tag: `[ai-slop]`

---

**Landing page `HowItWorks` and `Features` sections are identical bento card grids** at `src/app/page.tsx:222-237` and `src/app/page.tsx:280-295`
- Three equal-weight cards, then four equal-weight cards — both sections use the same rounded-2xl border bg-card layout, the same icon-in-accent/10-square pattern, the same size text. This is the most common 2024-era AI landing page composition. Neither section has a visual hierarchy within itself; everything competes equally.
- Give the primary feature card a breakout treatment (wider, image, or different background); use a list layout for secondary features instead of equal-weight cards.
- Tag: `[ai-slop]` `[hierarchy]`

---

**"Today's macros" section label uses the Sparkles+uppercase pattern AND the home page already uses it for the ProactiveBrief** at `src/app/home/page.tsx:72`
- `text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground` appears as the section label for "Today's macros", mirroring the identical treatment inside ProactiveBrief's "TODAY'S BRIEF" header, CheckinPeek's "TODAY'S CHECK-IN", and PantryStat's "PANTRY". Four cards on one screen all have the same label typographic treatment — the eye cannot prioritise anything.
- Reserve the uppercase-tracked label for one tier of information architecture, not every card. Use relative weight (size, color) to differentiate card types.
- Tag: `[ai-slop]` `[hierarchy]`

---

**Raw Tailwind color classes used for macro colors, bypassing the token system** at `src/components/feature/home/HomeMacroRing.tsx:30,37,44` and `src/components/feature/home/LastCookedCard.tsx:55,61`
- `stroke-blue-500`, `stroke-amber-500`, `stroke-orange-400`, `text-blue-500`, `text-amber-500` are all raw Tailwind palette classes. The codebase has `--cat-protein`, `--cat-grain`, etc. tokens in `tokens.css` that correctly define dark-mode variants. Using raw Tailwind classes means dark-mode saturation is uncontrolled and the values won't update if the palette changes.
- Map protein → `text-cat-protein` / `stroke-[--cat-protein]`, carbs → `text-cat-grain`, fat → `text-cat-pantry` (or dedicate a fat token) so dark-mode remains coherent.
- Tag: `[dark-mode]` `[anti-pattern]`

---

**`CheckinPeek` uses raw green and amber classes for status badge and icon** at `src/components/feature/home/CheckinPeek.tsx:37,47,58`
- `text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950` for the "Logged" badge and `text-amber-500` for the ZapIcon are raw color classes. The system has `--ok`, `--ok-fg`, `--warn` tokens. The green badge is also manually dark-mode-paired — the token system handles that automatically.
- Replace with `bg-ok/10 text-ok` for the badge and token-mapped icon colors.
- Tag: `[dark-mode]` `[anti-pattern]`

---

**`PantryStat` warning state uses raw orange classes** at `src/components/feature/home/PantryStat.tsx:20,28,42`
- `border-orange-200 dark:border-orange-900`, `text-orange-500`, `text-orange-600 dark:text-orange-400` are all raw values. The system has `--warn` and `--warn-fg` tokens.
- Replace with `border-warn/30`, `text-warn`, `text-warn-fg`.
- Tag: `[dark-mode]` `[anti-pattern]`

---

**`SmileIcon` used as the training activity icon** at `src/components/feature/home/CheckinPeek.tsx:58`
- A smiley face icon is semantically wrong for "Training". It communicates mood/sentiment, not physical activity. A user glancing at the card would reasonably misread it as a mood field. The training icon elsewhere in the codebase (CheckinForm) uses nothing because the SegmentedControl is self-labelled.
- Replace with `DumbbellIcon` or `ActivityIcon` (Lucide) which are semantically unambiguous for training load.
- Tag: `[hierarchy]`

---

**Feed Me page header is a duplicate of the tab-bar label, adding nothing** at `src/app/feed-me/page.tsx:26-28`
- The sticky `<h1>Feed Me</h1>` header at the top of the feed-me page repeats the tab-bar label directly above it (on mobile). There is no secondary context, no subtitle, no action. It's chrome consuming ~45px of prime real estate that could be given to the first recommendation card.
- Remove or replace with contextual status ("3 suggestions for tonight" / "Fetching your picks…") that changes based on island phase.
- Tag: `[hierarchy]` `[vibe-code]`

---

**`shadow-xl` and `hover:shadow-lg` in landing page bypass the shadow token system** at `src/app/page.tsx:125,226,329`
- `shadow-xl` (Tailwind default) and `hover:shadow-lg` are used on three landing page cards while the codebase defines `shadow-1`, `shadow-2`, `shadow-3` tokens that are calibrated for the palette. The raw Tailwind shadows are cooler and higher-contrast, looking inconsistent in dark mode.
- Replace with `shadow-3` and `hover:shadow-3` (or `shadow-2`) from the token system.
- Tag: `[dark-mode]` `[vibe-code]`

---

**`MacroRing` UI primitive is a stub with a single border circle, not a ring** at `src/components/ui/macro-ring.tsx:23-41`
- The component is documented as "Apple-Activity-style three-ring" (its own JSDoc comment) but renders a single `border-4 border-accent/30` circle containing a kcal number. The `HomeMacroRing` feature component does implement actual SVG rings. Callers in `ProfileView` and `MacrosCard` (recipe detail) get a decorative placeholder that doesn't communicate the macro breakdown they expect. A user viewing their recipe macros sees a circle that says "612 / 612 kcal" with no rings.
- Either implement the three-ring SVG in the primitive (consolidating with HomeMacroRing's implementation) or rename it `KcalCircle` to match what it actually does, so callers aren't misled.
- Tag: `[hierarchy]` `[anti-pattern]`

---

**Onboarding `OnboardingStepper` doesn't receive `activeStep` from its parent** at `src/app/onboarding/layout.tsx:59`
- `<OnboardingStepper profile={profile} />` omits the `activeStep` prop. The component uses `activeStep` only to set `aria-current="step"` on the active circle and `text-foreground` on its label — both meaningful for keyboard/screen-reader users navigating onboarding. Without it, all steps look equal (no highlighted current step).
- Pass `stepNum` from the page to the layout (or derive it from the URL in the layout) and forward it as `activeStep`.
- Tag: `[hierarchy]` `[anti-pattern]`

---

## Medium (technical debt; fix opportunistically)

---

**Two separate MacroRing implementations exist with no bridge** at `src/components/ui/macro-ring.tsx` and `src/components/feature/home/HomeMacroRing.tsx`
- `HomeMacroRing` has a complete SVG donut implementation; `MacroRing` (the shared primitive) is a stub. Any future caller wanting real rings must duplicate `HomeMacroRing`'s SVG logic or wire it manually. The stub comment says "TODO: Plan 08 fills" — that plan is apparently complete (the home page renders fine), but the primitive was never updated.
- Promote `HomeMacroRing`'s SVG logic into `src/components/ui/macro-ring.tsx`, then replace `HomeMacroRing` with a thin adapter that maps the profile/checkin props to the primitive's `consumed`/`target` shape.
- Tag: `[vibe-code]` `[anti-pattern]`

---

**`FeedMeCta` is marked `'use client'` but has no client-side interactivity** at `src/components/feature/home/FeedMeCta.tsx:1`
- The component is a styled `<Link>` with a CSS animation class (`feedme-shimmer`). There's no state, no event handler that requires the client runtime, no hook. The `'use client'` boundary forces the parent home RSC to create an island for a pure link.
- Remove `'use client'`. The shimmer animation is pure CSS and works without a client boundary.
- Tag: `[vibe-code]` `[anti-pattern]`

---

**`MealCard` UI primitive is `'use client'` for no reason** at `src/components/ui/meal-card.tsx:1`
- `MealCard` contains no hooks, no event handlers, no state. Its `onPress` prop is optional and when absent the component is purely presentational. The only interaction is a `role="button"` div which doesn't require the client runtime — but it's also a pattern that could be a `<button>` or `<Link>` instead.
- Remove `'use client'`. If the press handler is needed in specific contexts, lift the interactivity to the call site.
- Tag: `[vibe-code]` `[anti-pattern]`

---

**`HomeMacroRing` uses `stroke-blue-500`, `stroke-amber-500`, `stroke-orange-400` as computed string values for SVG class names** at `src/components/feature/home/HomeMacroRing.tsx:30-44,122-127`
- The legend also performs `arc.colorClass.replace('stroke-', 'bg-')` to derive background colors, which is fragile string manipulation. If any color class name changes format, the replacement silently produces nothing.
- Use explicit separate `strokeColor` and `bgColor` properties per arc, or map to token-based SVG `stroke` attribute values (`stroke-[rgb(var(--cat-protein))]`) rather than class-name juggling.
- Tag: `[vibe-code]` `[anti-pattern]`

---

**Onboarding layout and step page each run an independent Supabase query to build `Partial<Profile>`** at `src/app/onboarding/layout.tsx:20` and `src/app/onboarding/step/[step]/page.tsx:28`
- On each step navigation the user triggers two waterfall round-trips to the database (layout query + page query), fetching overlapping but not identical column sets. The layout fetches 8 columns; the page fetches 12.
- Consolidate into one server function that fetches the superset, cache with `unstable_cache` scoped to the user, or pass the profile down through RSC slot props.
- Tag: `[anti-pattern]`

---

**`RecipeTweakPanel`'s `Sparkles` icon + "Parse with AI" button label in `PantryAddDialog` repeat the AI-slop icon pattern** at `src/components/feature/feed-me/RecipeTweakPanel.tsx:134` and `src/components/feature/pantry/PantryAddDialog.tsx:224-225`
- The Sparkles icon appears 7 times across the app: landing page badge, landing hero, landing Feed Me demo, AppShell tab, FeedMeCta, ProactiveBrief header, RecipeTweakPanel submit, and PantryAddDialog parse button. It has become a generic "this does something with AI" stamp rather than a meaningful signal. Overuse has made it invisible.
- Reserve the Sparkles icon for the single primary AI action (Feed Me). Use domain-appropriate icons elsewhere: `Wand2` for tweak (already imported but the submit button uses Sparkles), `ScanText` or `Cpu` for AI parsing in pantry.
- Tag: `[ai-slop]`

---

**`RegenerateButton` creates an inner `useTransition` that is always shadowed by `isPending` from its parent** at `src/components/feature/feed-me/RegenerateButton.tsx:15-18`
- The component initialises its own `[isTransitioning, startTransition]` and computes `busy = isPending ?? isTransitioning`. But the parent `FeedMeIsland` always passes `isPending` (never undefined), so `isTransitioning` is dead state. The button also wraps `onRegenerate()` in `startTransition` even though `onRegenerate` is already called inside a `startTransition` in the parent.
- Remove the inner `useTransition`; accept only the `isPending` prop. The parent owns the transition.
- Tag: `[vibe-code]`

---

**`PantryAddDialog` uses a native `<dialog>` element but manually positions it with fixed/absolute CSS** at `src/components/feature/pantry/PantryAddDialog.tsx:140-148`
- The dialog uses `<dialog open className="fixed inset-0 ... m-0 p-0 ...">` which overrides the browser's native dialog positioning and loses the native focus trap, backdrop (`::backdrop` pseudo-element), and `Escape` key dismissal. The `onClose` handler relies on the native close event but custom CSS means the backdrop is a sibling div, not the native backdrop.
- Replace with the existing `Dialog` from `src/components/ui/dialog.tsx` (Radix UI, which correctly handles all the above) or use the `PantryAddDialog` structure inside Radix's Dialog root.
- Tag: `[vibe-code]` `[anti-pattern]`

---

**`GoalStep` uses a hidden `<input type="hidden" name="goal" value={selected}>` pattern instead of native radio inputs** at `src/components/feature/home/GoalStep.tsx:51,58-103`
- The three goal options are `<button type="button">` elements that set React state, which is then piped through a hidden input to FormData. This breaks native form submission, screen reader "radio group" semantics, and keyboard navigation between options. The `aria-pressed` on a non-radio button inside a `<fieldset>` is also incorrect semantics — `aria-pressed` is for toggle buttons, not radio-equivalent single-select.
- Use `<input type="radio" name="goal" value={value}>` with visually-hidden input + custom styled label, which preserves keyboard navigation, screen reader group semantics, and native FormData.
- Tag: `[vibe-code]` `[anti-pattern]`

---

**`BodyDataStep` silently drops `sex: 'other'` and `sex: 'prefer_not_to_say'`** at `src/components/feature/home/BodyDataStep.tsx:22-25,72`
- The `SexValue` type is narrowed to `'male' | 'female'` and the segmented control only offers those two options, but the Zod schema in `actions.ts:50` accepts all four values and the Profile contract includes `'other' | 'prefer_not_to_say'`. Any user who chose "Other" during a previous onboarding attempt will find their selection silently lost on edit.
- Add a third option ("Prefer not to say") to the segmented control, or document explicitly in the form that non-binary options are edit-only via the profile edit page.
- Tag: `[anti-pattern]`

---

**`checkin/page.tsx` re-validates the raw action return through `Checkin.parse()` on the server** at `src/app/checkin/page.tsx:25`
- `getTodayCheckin()` (a typed server action) already returns a typed DTO. The page re-parses it with `Checkin.parse(rawExisting)` as a guard. This means if the action's return type and the Zod schema ever diverge, the page throws a runtime parse error instead of a type error at build time. It also silently re-coerces the `created_at` ISO string on every page load.
- Remove the redundant `Checkin.parse()`. Trust the server action's return type (it's already validated at the action boundary). Add a comment explaining the action already validates.
- Tag: `[vibe-code]`

---

## Low (nits)

---

**`ProactiveBrief` gradient from `from-surface-elevated via-card to-card` is imperceptible** at `src/components/feature/home/ProactiveBrief.tsx:139`
- `surface-elevated` is `249 249 249` and `card` is the same token (`surface-elevated` → `card` aliased in tailwind.config.ts). The gradient goes from a color to itself. It renders as a flat card visually but the class is noise.
- Remove the gradient classes; use `bg-card` flat. Saves two class strings and one paint operation.
- Tag: `[ai-slop]` `[vibe-code]`

---

**`SavedGrid` links wrap the entire `MealCard` in `<Link>` but MealCard has its own `role="button"` div** at `src/components/feature/recipes/SavedGrid.tsx:84-99`
- Wrapping `<Link>` around a `role="button"` div creates an interactive element inside an interactive element, which is invalid HTML. Screen readers will announce it confusingly.
- Either make `MealCard` accept `href` and render itself as an `<a>` internally, or remove the `role="button"` from `MealCard` when it's used inside a link context (pass `onPress={undefined}`).
- Tag: `[anti-pattern]`

---

**`BodyDataStep` uses US units in the form (ft/in, lbs) but converts to metric for the server** at `src/components/feature/home/BodyDataStep.tsx:41-93`
- There's no unit preference setting. International users will be surprised to see US units pre-selected. The conversion is correct but undocumented to the user.
- Add a unit toggle (metric / imperial) so users see their preferred units, or at minimum add "US units" as a label so the form is unambiguous.
- Tag: `[hierarchy]`

---

**`RecipeDetail` has a hardcoded `pb-32` that may not account for the tab bar + CookButton combined height** at `src/components/feature/recipes/RecipeDetail.tsx:16`
- On mobile, the sticky `CookButton` at the bottom and the AppShell tab bar are both fixed. `pb-32` (128px) covers the CookButton alone (approx 80px) but may clip the last step on small screens when the tab bar (56px) is also present. The two fixed bars together are ~136px of blocked space.
- Replace with `pb-[calc(env(safe-area-inset-bottom)+140px)]` or compute the value from a shared layout constant.
- Tag: `[vibe-code]`

---

**`HeroPreview` in the landing page uses `rounded-3xl` but the rest of the card system uses `rounded-2xl`** at `src/app/page.tsx:125,329`
- Two hero preview cards use `rounded-3xl` (not a defined token radius — `--r-2xl` is 1.5rem, Tailwind's `rounded-3xl` is 1.875rem). This breaks the radius scale consistency without a semantic reason.
- Swap to `rounded-2xl` or add `--r-3xl` to the token system if the landing page intentionally uses a larger radius.
- Tag: `[vibe-code]`

---

**Landing page `SignatureMoments` section subtitle is hardcoded "Powered by Gemini · Tuned to you"** at `src/app/page.tsx:338`
- This is a product-specific claim baked in as static text in a demo mock card. If the LLM provider changes this would need a manual find-and-replace. It also exposes a vendor dependency in marketing copy before launch.
- Either remove the attribution line (the capability is described elsewhere) or source it from a `NEXT_PUBLIC_` env var or a constants file.
- Tag: `[vibe-code]`

---

**`OnboardingStepFrame` renders a `<Separator>` between the header and the step body on every step** at `src/components/feature/home/OnboardingStepFrame.tsx:51`
- The horizontal rule after the step title adds visual noise between descriptive copy and the interactive step content. Combined with the outer card border, the step header, and the back link, this is four visual delimiters before the user reaches the first interactive element.
- Remove the `<Separator>`. The vertical whitespace (`mb-6`) already provides sufficient separation.
- Tag: `[hierarchy]`

---

**`CheckinSummary` displays the Energy value as a raw number ("4/5") with no label for what 4 means** at `src/components/feature/checkin/CheckinSummary.tsx:63-65`
- The summary dl shows `4 /5` in a large mono numeral but the summary page doesn't map this to the label ("Good"). A user returning to the page after a day will need to recall the scale. The `ENERGY_LABELS` object is defined in both `CheckinPeek` and `CheckinSummary` separately (duplication) but only used in `CheckinPeek`.
- Add the label below the numeral in the summary, and consolidate `ENERGY_LABELS` into a shared constant in `src/lib/` or the checkin contract file.
- Tag: `[hierarchy]` `[vibe-code]`

---

**`PantryAddDialog` example chips say "Example 1", "Example 2", "Example 3"** at `src/components/feature/pantry/PantryAddDialog.tsx:204-214`
- The three example buttons display the label "Example 1", "Example 2", "Example 3" — not the example content itself. A user tapping "Example 1" will populate the text area with the full grocery dump string, but there's no preview of what they're picking. The button labels are informationally empty.
- Show a short truncated preview of the example text as the button label (e.g., "6 eggs, roast chicken…") so the user can tell examples apart before tapping.
- Tag: `[hierarchy]`
