'use client';
import { createBrowserClient } from '@/lib/supabase/browser';
import { useState } from 'react';

type Props = {
  /** Where to redirect after successful sign-in. Passed to the Supabase redirect URL. */
  next?: string;
};

export function SignInForm({ next = '/' }: Props) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    const supabase = createBrowserClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    if (error) {
      setStatus('error');
      setErrorMsg(error.message);
    } else {
      setStatus('sent');
    }
  }

  if (status === 'sent') {
    return (
      <p className="text-center text-sm text-muted-foreground">
        Check your inbox — a magic link is on its way to{' '}
        <span className="font-medium text-foreground">{email}</span>.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {status === 'error' && (
        <p role="alert" className="text-sm text-destructive">
          {errorMsg}
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-opacity disabled:opacity-50"
      >
        {status === 'loading' ? 'Sending…' : 'Send magic link'}
      </button>

      {process.env.NODE_ENV === 'development' && (
        <div className="flex flex-col gap-1.5 pt-2 mt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Dev shortcut — bypasses email (localhost only)
          </p>
          <a
            href={`/auth/dev?email=${encodeURIComponent(email || 'dev@whattoeat.local')}&next=${encodeURIComponent(next)}`}
            className="rounded-md border border-dashed border-border px-4 py-2 text-center text-sm font-medium text-foreground hover:bg-surface-elevated transition-colors"
          >
            Sign in as {email || 'dev@whattoeat.local'}
          </a>
        </div>
      )}
    </form>
  );
}
