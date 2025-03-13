import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from './providers';

// Load fonts with display: 'swap' for better performance
const geistSans = Geist({
  subsets: ["latin"],
  display: 'swap',
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: 'swap',
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "WhatToEat",
  description: "Generate recipes based on ingredients you have",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}