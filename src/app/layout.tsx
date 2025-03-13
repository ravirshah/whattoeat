import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'WhatToEat - Generate Recipes With Your Ingredients',
  description: 'Generate delicious recipes based on the ingredients you have at hand.',
  keywords: 'recipe generator, ingredients, cooking, food, meal planning',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-gray-50 font-sans antialiased dark:bg-gray-950 dark:text-gray-50">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}