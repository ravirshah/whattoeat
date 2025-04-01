'use client';

import { useEffect, ReactNode } from 'react';
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

  console.log(`[AuthWrapper] Render - loading: ${loading}, user: ${!!currentUser}`);

  // Handle redirection with explicit URL instead of router
  useEffect(() => {
    if (!loading && !currentUser && redirectIfNotAuthenticated) {
      // CRITICAL: Use window.location with ABSOLUTE URL to avoid path resolution issues
      const baseUrl = 'https://whattoeat.sortedbyshah.com/whattoeat';
      const targetPage = redirectTo.startsWith('/') ? redirectTo.substring(1) : redirectTo;
      const absoluteUrl = `${baseUrl}/${targetPage}`;
      
      console.log(`[AuthWrapper] Redirecting to absolute URL: ${absoluteUrl}`);
      window.location.href = absoluteUrl;
    }
  }, [loading, currentUser, redirectIfNotAuthenticated, redirectTo]);

  // If still loading, show loader
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Verifying Access...</p>
        </div>
      </div>
    );
  }

  // If authenticated or auth not required, show content
  if (currentUser || !redirectIfNotAuthenticated) {
    return <>{children}</>;
  }

  // Show redirect loading state
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-emerald-600" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Redirecting...</p>
      </div>
    </div>
  );
}