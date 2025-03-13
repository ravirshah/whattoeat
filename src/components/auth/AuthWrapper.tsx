// src/components/auth/AuthWrapper.tsx
'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';

interface AuthWrapperProps {
  children: ReactNode;
  redirectIfNotAuthenticated?: boolean;
  redirectTo?: string;
}

export default function AuthWrapper({
  children,
  redirectIfNotAuthenticated = true,
  redirectTo = '/signin'
}: AuthWrapperProps) {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    // If not loading anymore and there's no user
    if (!loading && !currentUser && redirectIfNotAuthenticated) {
      router.push(redirectTo);
    }

    // If not loading and there is a user, or if we don't need to redirect
    if ((!loading && currentUser) || !redirectIfNotAuthenticated) {
      setAuthenticated(true);
    }
  }, [currentUser, loading, redirectIfNotAuthenticated, redirectTo, router]);

  // Show loading state
  if (loading || (redirectIfNotAuthenticated && !authenticated)) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  // If we don't need authentication or we have a user, render children
  return <>{children}</>;
}