'use client';

import { withViewTransition } from '@/lib/view-transition';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ComponentProps, MouseEvent } from 'react';

type VtLinkProps = ComponentProps<typeof Link>;

/**
 * A Link that wraps the SPA navigation in a same-document View Transition
 * when the browser supports it. Falls back to a normal `<Link>` click when
 * the API or `prefers-reduced-motion` would prevent the transition.
 *
 * Pair with elements that share `viewTransitionName: 'vt-foo-<id>'` on both
 * the source (e.g. card title) and the destination (e.g. detail hero) so the
 * browser morphs them.
 */
export function VtLink({ href, onClick, ...rest }: VtLinkProps) {
  const router = useRouter();

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    if (onClick) onClick(e);
    if (e.defaultPrevented) return;
    // Skip when the user wants new-tab/new-window behaviour.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (typeof href !== 'string') return;
    if (typeof document === 'undefined') return;
    const doc = document as unknown as { startViewTransition?: unknown };
    if (typeof doc.startViewTransition !== 'function') return;
    e.preventDefault();
    withViewTransition(() => {
      router.push(href);
    });
  }

  return <Link href={href} {...rest} onClick={handleClick} />;
}
