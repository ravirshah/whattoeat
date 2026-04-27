'use client';

import { cn } from '@/components/ui/utils';
import {
  BookmarkIcon,
  HeartPulseIcon,
  HomeIcon,
  PackageIcon,
  SparklesIcon,
  UserCircleIcon,
  UtensilsIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

// Routes where the chrome should be hidden — landing, auth, onboarding, offline.
const CHROMELESS_PREFIXES = ['/auth', '/onboarding', '/offline'];

const NAV_ITEMS: { href: string; label: string; icon: typeof HomeIcon }[] = [
  { href: '/home', label: 'Home', icon: HomeIcon },
  { href: '/pantry', label: 'Pantry', icon: PackageIcon },
  { href: '/feed-me', label: 'Feed Me', icon: SparklesIcon },
  { href: '/recipes/saved', label: 'Recipes', icon: BookmarkIcon },
  { href: '/checkin', label: 'Check-in', icon: HeartPulseIcon },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/home') return pathname === '/home' || pathname === '/';
  if (href.startsWith('/recipes')) return pathname.startsWith('/recipes');
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '/';

  // Landing page handles its own chrome.
  const isLanding = pathname === '/';
  const isChromeless =
    isLanding || CHROMELESS_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (isChromeless) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <DesktopHeader pathname={pathname} />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <MobileTabBar pathname={pathname} />
    </div>
  );
}

function DesktopHeader({ pathname }: { pathname: string }) {
  return (
    <header className="sticky top-0 z-30 hidden border-b border-border/60 bg-background/85 backdrop-blur-md md:block">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-3">
        <Link href="/home" className="flex shrink-0 items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent/10 text-accent">
            <UtensilsIcon className="h-4 w-4" />
          </span>
          <span className="text-base font-semibold tracking-tight text-foreground">WhatToEat</span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-accent/10 text-accent'
                    : 'text-muted-foreground hover:bg-surface-elevated hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/profile"
          aria-label="Profile"
          className={cn(
            'inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors',
            pathname.startsWith('/profile')
              ? 'bg-accent/10 text-accent'
              : 'text-muted-foreground hover:bg-surface-elevated hover:text-foreground',
          )}
        >
          <UserCircleIcon className="h-5 w-5" />
        </Link>
      </div>
    </header>
  );
}

function MobileTabBar({ pathname }: { pathname: string }) {
  // 5-tab bar with the Feed Me CTA elevated as the visual centerpiece.
  const items = [
    { href: '/home', label: 'Home', icon: HomeIcon },
    { href: '/pantry', label: 'Pantry', icon: PackageIcon },
    { href: '/feed-me', label: 'Feed Me', icon: SparklesIcon, primary: true },
    { href: '/recipes/saved', label: 'Recipes', icon: BookmarkIcon },
    { href: '/profile', label: 'Profile', icon: UserCircleIcon },
  ];

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2 py-1.5">
        {items.map(({ href, label, icon: Icon, primary }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-1.5 text-[10px] font-medium transition-colors',
                  primary
                    ? active
                      ? 'text-accent'
                      : 'text-foreground'
                    : active
                      ? 'text-accent'
                      : 'text-muted-foreground',
                )}
              >
                <span
                  className={cn(
                    'inline-flex items-center justify-center transition-transform',
                    primary
                      ? cn(
                          'h-9 w-9 rounded-full',
                          active ? 'bg-accent text-accent-foreground' : 'bg-accent/10 text-accent',
                        )
                      : 'h-6 w-6',
                  )}
                >
                  <Icon
                    className={primary ? 'h-4 w-4' : 'h-5 w-5'}
                    strokeWidth={primary ? 2.5 : 2}
                  />
                </span>
                <span className="leading-none">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
