import { SignInForm } from '@/components/auth/SignInForm';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create account — WhatToEat',
};

export default function SignupPage() {
  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
          <p className="text-sm text-muted-foreground">
            Enter your email — we&apos;ll send a link to get you started.
          </p>
        </div>
        <SignInForm next="/onboarding" />
      </div>
    </main>
  );
}
