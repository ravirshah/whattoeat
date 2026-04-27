/**
 * src/app/layout.tsx
 *
 * Root layout — applies to every route in the app.
 *
 * PWA additions (Track 11):
 *   - metadata.manifest links to /manifest.webmanifest
 *   - viewport.themeColor matches --accent token (#D97706)
 *   - viewport.viewportFit = 'cover' enables env(safe-area-inset-*) on iOS
 *   - SwRegister mounts the Workbox service worker registration in production
 *   - InstallPrompt shows the "Add to home screen" banner when supported
 */

import { AppShell } from '@/components/layout/AppShell';
import { SwRegister } from '@/components/pwa';
import { InstallPrompt } from '@/components/pwa';
import { THEME_COLOR_DARK, THEME_COLOR_LIGHT } from '@/lib/pwa/theme-colors';
import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';

import '@fontsource/geist-sans/400.css';
import '@fontsource/geist-sans/500.css';
import '@fontsource/geist-sans/600.css';
import '@fontsource/geist-sans/700.css';
import '@fontsource/geist-mono/400.css';
import '@fontsource/geist-mono/600.css';

import '@/app/globals.css';

// ---------------------------------------------------------------------------
// Metadata — Next.js generates <link> and <meta> tags from this object.
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: { default: 'WhatToEat', template: '%s — WhatToEat' },
  description:
    'Personal meal-decision engine. Pantry + goals + daily check-in -> recommended meals.',
  applicationName: 'WhatToEat',
  manifest: '/manifest.webmanifest',

  // Apple-specific — Next.js emits these as <meta name="apple-*"> tags.
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'WhatToEat',
  },

  icons: {
    icon: [{ url: '/icons/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/icons/icon.svg', type: 'image/svg+xml' }],
  },

  openGraph: {
    type: 'website',
    siteName: 'WhatToEat',
    title: 'WhatToEat',
    description: 'Personal meal-decision engine.',
  },

  robots: { index: true, follow: true },
};

// ---------------------------------------------------------------------------
// Viewport — Next.js 15 requires this to be a separate named export.
// viewportFit: 'cover' enables env(safe-area-inset-*) CSS variables on iOS.
// ---------------------------------------------------------------------------

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  // themeColor matches --accent (#D97706 light, #FCD34D dark).
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: THEME_COLOR_LIGHT },
    { media: '(prefers-color-scheme: dark)', color: THEME_COLOR_DARK },
  ],
};

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
`.trim();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: dark mode no-flash script is trusted static code */}
        <script dangerouslySetInnerHTML={{ __html: darkModeScript }} />
      </head>
      <body
        className={[
          // Safe-area-inset padding for iOS standalone mode.
          'pt-[env(safe-area-inset-top)]',
          'pb-[env(safe-area-inset-bottom)]',
          'pl-[env(safe-area-inset-left)]',
          'pr-[env(safe-area-inset-right)]',
        ].join(' ')}
      >
        <AppShell>{children}</AppShell>
        <Toaster
          position="bottom-center"
          toastOptions={{
            classNames: {
              toast: 'bg-surface-elevated text-text border border-border shadow-2 rounded-xl',
              actionButton: 'bg-accent text-accent-fg rounded-lg text-xs font-medium',
              cancelButton: 'bg-surface-elevated text-text-muted rounded-lg text-xs',
            },
          }}
        />
        {/*
          InstallPrompt — shows "Add to home screen" banner when supported.
          Suppressed in standalone mode (already installed).
        */}
        <InstallPrompt />
        {/*
          SwRegister — mounts the Workbox SW registration in production.
          No-op in development. Placed last in body so it does not delay LCP.
        */}
        <SwRegister />
      </body>
    </html>
  );
}
