'use client';

import { cn } from '@/components/ui/utils';
import { SparklesIcon } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef } from 'react';

/**
 * Magnetic effect: pointer proximity nudges the CTA toward the cursor by a
 * small amount. Snaps back smoothly on leave. No-op for keyboard or touch.
 *
 * Uses pointer events on the parent surface so the magnet pulls the button
 * even when the cursor is in its halo, which is what makes it feel alive.
 */
const PULL_RADIUS = 110; // px
const MAX_OFFSET = 6; // px

export function FeedMeCta() {
  const linkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const el = linkRef.current;
    if (!el) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    function handleMove(e: PointerEvent) {
      // Only react to mouse/pen — touch raw-fires here too but we want it idle.
      if (e.pointerType === 'touch' || !el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > PULL_RADIUS) {
        el.style.transform = '';
        return;
      }
      const strength = (1 - dist / PULL_RADIUS) * MAX_OFFSET;
      const angle = Math.atan2(dy, dx);
      el.style.transform = `translate(${Math.cos(angle) * strength}px, ${Math.sin(angle) * strength}px)`;
    }

    function handleLeave() {
      if (el) el.style.transform = '';
    }

    window.addEventListener('pointermove', handleMove, { passive: true });
    window.addEventListener('pointerleave', handleLeave);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerleave', handleLeave);
    };
  }, []);

  return (
    <Link
      ref={linkRef}
      href="/feed-me"
      className={cn(
        'magnetic',
        'flex items-center justify-center gap-3',
        'w-full rounded-2xl py-5 px-6',
        'text-lg font-bold tracking-tight',
        'bg-accent text-accent-foreground',
        'feedme-shimmer',
        'hover:shadow-3',
        'active:scale-[0.98]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      )}
    >
      <SparklesIcon className="w-5 h-5 flex-shrink-0" />
      Feed Me
    </Link>
  );
}
