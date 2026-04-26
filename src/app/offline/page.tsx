/**
 * src/app/offline/page.tsx — server component wrapper (exports metadata)
 */
import type { Metadata } from 'next';
import { OfflinePageClient } from './_client';

export const metadata: Metadata = {
  title: "You're offline — WhatToEat",
  description: 'It looks like you have lost your internet connection.',
  robots: { index: false },
};

export default function OfflinePage() {
  return <OfflinePageClient />;
}
