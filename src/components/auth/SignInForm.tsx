'use client';
import { getSiteUrl } from '@/lib/site-url';
import { createBrowserClient } from '@/lib/supabase/browser';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Props = {
  /** Where to redirect after successful sign-in. Passed to the Supabase redirect URL. */
  next?: string;
};

type Mode = 'magic' | 'password';

export function SignInForm({ next = '/' }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    const supabase = createBrowserClient();

    if (mode === 'password') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setStatus('error');
        setErrorMsg(error.message);
        return;
      }
      router.push(next);
      router.refresh();
      return;
    }

    const redirectTo = `${getSiteUrl()}/auth/callback?next=${encodeURIComponent(next)}`;
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
      <div
        role="tablist"
        aria-label="Sign-in method"
        className="grid grid-cols-2 rounded-md border border-border bg-surface p-0.5 text-xs font-medium"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'password'}
          onClick={() => setMode('password')}
          className={
            mode === 'password'
              ? 'rounded-sm bg-accent px-2 py-1.5 text-accent-foreground'
              : 'rounded-sm px-2 py-1.5 text-muted-foreground'
          }
        >
          Password
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'magic'}
          onClick={() => setMode('magic')}
          className={
            mode === 'magic'
              ? 'rounded-sm bg-accent px-2 py-1.5 text-accent-foreground'
              : 'rounded-sm px-2 py-1.5 text-muted-foreground'
          }
        >
          Magic link
        </button>
      </div>

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

      {mode === 'password' && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}

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
        {status === 'loading'
          ? mode === 'password'
            ? 'Signing in…'
            : 'Sending…'
          : mode === 'password'
            ? 'Sign in'
            : 'Send magic link'}
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
