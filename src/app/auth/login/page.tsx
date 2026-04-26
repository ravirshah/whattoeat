import { SignInForm } from '@/components/auth/SignInForm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign in — WhatToEat',
};

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const { next } = await searchParams;

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="text-sm text-muted-foreground">Enter your email to receive a magic link.</p>
        </div>
        <SignInForm next={next ?? '/home'} />
      </div>
    </main>
  );
}
