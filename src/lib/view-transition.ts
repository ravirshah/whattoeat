/**
 * Run a state-mutating callback inside a same-document View Transition when
 * the browser supports it. Falls back to running the callback synchronously
 * if the API is missing or the user prefers reduced motion.
 *
 * Usage:
 *   withViewTransition(() => setItems(next));
 *
 * Notes:
 * - Elements whose positions/identities should morph need a stable
 *   `view-transition-name` (set via inline style or a CSS class) so the
 *   browser can pair the old/new snapshot.
 * - Names must be unique per frame. Prefer `vt-<scope>-<id>`.
 */
type DocLike = { startViewTransition?: (cb: () => void) => unknown };

export function withViewTransition(update: () => void): void {
  if (typeof document === 'undefined') {
    update();
    return;
  }

  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const doc = document as unknown as DocLike;
  if (reduced || typeof doc.startViewTransition !== 'function') {
    update();
    return;
  }

  doc.startViewTransition(update);
}
