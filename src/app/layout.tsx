import type { Metadata } from 'next';
import { Toaster } from 'sonner';

import '@fontsource/geist-sans/400.css';
import '@fontsource/geist-sans/500.css';
import '@fontsource/geist-sans/600.css';
import '@fontsource/geist-sans/700.css';
import '@fontsource/geist-mono/400.css';
import '@fontsource/geist-mono/600.css';

import '@/app/globals.css';

export const metadata: Metadata = {
  title: { default: 'WhatToEat', template: '%s — WhatToEat' },
  description: 'Personal meal-decision engine. Pantry + goals + daily check-in -> what to eat.',
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
  );
}
