# Next.js InvariantError Diagnosis — 2026-04-26

## Most likely root cause

**`@sentry/nextjs` 8.55.1 `autoInstrumentAppDirectory: true` is incompatible with Next.js 15.5.x's new rendering pipeline.**

`withSentryConfig` with `autoInstrumentAppDirectory: true` (in `next.config.ts` lines 50–52) causes Sentry's webpack plugin to inject a HOC proxy wrapper around every RSC page component at build time (via `serverComponentWrapperTemplate.js`). In Next.js 15.5, three new render-path entry points were introduced — `prospectiveRuntimeServerPrerender`, `finalRuntimeServerPrerender`, and `renderToStream` — each of which immediately calls `assertClientReferenceManifest(clientReferenceManifest)`. If `renderOpts.clientReferenceManifest` is `undefined` when control reaches any of these paths, error **E692** is thrown.

The manifest (`__RSC_MANIFEST[entryName]` inside the page's `_client-reference-manifest.js`) is loaded by `tryLoadClientReferenceManifest` in `load-components.js`. It returns `undefined` (swallowing the error silently) whenever the manifest file exists but the key lookup fails. The key is derived from `page.replace(/%5F/g, '_')`. When Sentry's wrapper replaces the original module in the webpack graph, the module-path key that Next.js computes for the manifest can diverge from the actual key written into the manifest at build time — specifically on dynamic pages that trigger the new prerendering paths.

Both freshly-hit dynamic pages in the app are affected:
- `src/app/home/page.tsx` — calls `getOrComputeForWeek` (DB I/O → dynamic)
- `src/app/feed-me/page.tsx` — calls `await cookies()` explicitly → dynamic

Both confirmed dynamic by the build output (`ƒ (Dynamic) server-rendered on demand`).

## Evidence

1. **`bun run build` passes cleanly** — no build-time error, all 22 route manifests generated:
   ```
   /Users/ravishah/Documents/whattoeat/.next/server/app/home/page_client-reference-manifest.js  ✓
   /Users/ravishah/Documents/whattoeat/.next/server/app/feed-me/page_client-reference-manifest.js  ✓
   ```
   The manifests exist and are non-empty (38 KB each). A stale-cache or build-time boundary error can be ruled out.

2. **Sentry IS wrapping the compiled page bundles** — confirmed by grepping the compiled JS:
   ```
   grep -c "wrapServerComponentWithSentry" .next/server/app/home/page.js   → 2
   grep -c "wrapServerComponentWithSentry" .next/server/app/feed-me/page.js → 5
   ```
   The Sentry `serverComponentWrapperTemplate.js` template uses a `Proxy` on the original page function and re-exports via `export * from '__SENTRY_WRAPPING_TARGET_FILE__'`, but does NOT forward any webpack-internal RSC manifest metadata.

3. **Next.js version jump**: `package.json` specifies `"next": "^15.2.2"` but `15.5.15` is installed (via the recent `bun install`). The three new render paths that call `assertClientReferenceManifest` were added in 15.5.x and did not exist in 15.2.x. Sentry 8.55.1 has not yet been updated to handle this.

4. **Error code E692** is thrown by `assertClientReferenceManifest` in:
   ```
   node_modules/next/dist/esm/server/app-render/app-render.js
   ```
   All four call sites pass `clientReferenceManifest` from `renderOpts`, which in turn comes from `tryLoadClientReferenceManifest` — the function that silently returns `undefined` on lookup failure.

5. **No `dynamic()` usage** in the codebase. No mixed `'use client'`/`'use server'` in a single module. No server-only module accidentally imported into a client component. No barrel re-exporting both sides. The RSC boundary is structurally correct throughout.

## Recommended fix (specific file + line + change)

### Fix 1 — Disable Sentry App Directory auto-instrumentation (addresses the root cause)

**File:** `next.config.ts`

**Current (lines 50–52):**
```ts
  autoInstrumentServerFunctions: true,
  autoInstrumentMiddleware: true,
  autoInstrumentAppDirectory: true,
```

**Change to:**
```ts
  autoInstrumentServerFunctions: false,   // ← disable HOC wrapping of RSC pages
  autoInstrumentMiddleware: true,          // ← middleware instrumentation is safe
  autoInstrumentAppDirectory: false,       // ← this is the specific trigger
```

`autoInstrumentAppDirectory: false` stops Sentry from injecting the `serverComponentWrapperTemplate` proxy. Sentry still captures errors from RSC pages because `onRequestError` in `src/instrumentation.ts` already forwards all rendering errors to Sentry — that hook is the correct Next.js 15 mechanism for RSC error capture and does not depend on HOC wrapping.

`autoInstrumentServerFunctions: false` is set alongside it because the two options share the same proxy mechanism and Next.js 15.5's new routes make both unsafe at the current Sentry version.

### Fix 2 — Pin Next.js to 15.2.x until Sentry publishes a 15.5-compatible release (alternative if Fix 1 has side-effects)

**File:** `package.json`, line with `"next"`:

Change `"^15.2.2"` to `"~15.2.2"` (patch-only upgrades) or the exact known-good version `"15.2.4"`, then run `bun install`. This prevents the automatic upgrade to 15.5.x that introduced the incompatible render paths.

### Fix 3 — Replace `ServerError` class with a plain-object error (separate serialization bug, not E692)

Multiple `'use server'` files return `{ ok: false, error: new ServerError(...) }` to `'use client'` components. `ServerError` extends `Error` — a class instance. React 19's Server Action serialization strips all custom properties when crossing the wire; only `.message` and `.stack` survive. The `.code` property (read at `FeedMeIsland.tsx:46` via `RecommendActionResult`, and structurally by any future reader of `ActionResult`) is silently dropped.

**File:** `src/server/contracts.ts`

Replace the class:
```ts
// BEFORE
export class ServerError extends Error {
  constructor(
    public readonly code: ServerErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ServerError';
  }
}
export type ActionResult<T> = { ok: true; value: T } | { ok: false; error: ServerError };
```

With a plain-object error type:
```ts
// AFTER
export type ServerError = {
  code: ServerErrorCode;
  message: string;
};
export type ActionResult<T> = { ok: true; value: T } | { ok: false; error: ServerError };
```

Then update every construction site (`new ServerError(code, msg)` → `{ code, message: msg }`), every `instanceof ServerError` check, and remove the `toServerError` helper function. This ensures the full error object round-trips correctly through the Server Action wire protocol.

## Verification steps

1. Apply Fix 1 (set `autoInstrumentAppDirectory: false`, `autoInstrumentServerFunctions: false`).
2. Delete `.next/` cache: `rm -rf .next`.
3. Run `bun run build` — should still pass.
4. Run `bun run start` (or `bun run dev`) and navigate to `/home` and `/feed-me`.
5. Confirm no `InvariantError: Expected clientReferenceManifest` in the terminal or browser console.
6. Confirm Sentry still receives errors by checking `src/instrumentation.ts` `onRequestError` hook is intact — it will continue to work because it hooks into Next.js's native error reporting, independent of HOC wrapping.

If E692 still appears after Fix 1, apply Fix 2 (pin Next.js to `~15.2.2`) as the fallback.

## Alternative hypotheses (if primary doesn't pan out)

### Alt-1: Stale `.next` cache after `bun install`
The `bun install` that rewrote `package.json` upgraded Next.js from ~15.2 to 15.5. The `.next/` directory may have been generated by the old version and not fully invalidated. Running `rm -rf .next && bun run build` should resolve this independently. Observed build timestamps all show `Apr 26 20:27` so this appears to have been addressed, but a clean rebuild in CI may still differ.

### Alt-2: `src/app/sw.ts` leaking into the webpack module graph
`src/app/sw.ts` uses `importScripts()` and SW globals, sits inside `src/app/` (Next.js's App Router root), and is marked `@ts-nocheck`. If webpack accidentally picks it up as a module (Next.js ignores non-route filenames but a misconfigured `tsconfig.include` could include it), it could corrupt the RSC module graph for any page that shares a chunk with it. Verify by checking `next.config.ts`'s `pageExtensions` and the file's `nft.json` trace. Currently no evidence it's bundled — the trace doesn't include it.

### Alt-3: `modifyRecipe` / `ServerError` class causing RSC serialization panic
In React 19, returning a class instance from a Server Action (`{ ok: false, error: new ServerError(...) }`) can in theory cause React Flight to throw during serialization if the class has a `toJSON()` method or if the Error subclass triggers an unexpected branch in the Flight serializer. This would appear as an error during the server action response, not during page load — but a caught serialization error that bubbles incorrectly could manifest as a manifest error. This is lower probability than the Sentry/Next version mismatch and would only fire on the `modifyRecipe` / `saveRecipe` / `markCooked` code paths, not on initial page load.

### Alt-4: Missing `'use server'` on `src/server/recommendation/weekly-insight-repo.ts`
`weekly-insight-repo.ts` has `import 'server-only'` but NOT `'use server'`. Its exported functions are called directly from the RSC page (`home/page.tsx`), which is correct — they are server functions, not Server Actions. However, if a future refactor accidentally imports this module from a client context, `server-only` will throw at module load time, which could surface as a manifest-related error in the error boundary. Currently not triggered but worth noting for robustness.
