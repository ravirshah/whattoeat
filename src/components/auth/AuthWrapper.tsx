'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { Loader2 } from 'lucide-react';

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
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // If we don't need authentication or we have a user, render children
  return <>{children}</>;
}