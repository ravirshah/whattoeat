'use client';
import { signOut } from '@/server/auth/sign-out';
import { useTransition } from 'react';

type Props = {
  className?: string;
};

export function SignOutButton({ className }: Props) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      className={className}
      onClick={() =>
        startTransition(async () => {
          await signOut();
        })
      }
    >
      {isPending ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
