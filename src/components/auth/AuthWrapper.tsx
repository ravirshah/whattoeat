'use client';

import { useEffect, ReactNode } from 'react';
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

  console.log(`[AuthWrapper] Render - loading: ${loading}, user: ${!!currentUser}`);

  // Handle redirection with proper path normalization
  useEffect(() => {
    if (!loading && !currentUser && redirectIfNotAuthenticated) {
      // CRITICAL FIX: Ensure no double paths in redirect URL
      let path = redirectTo;
      
      // Remove any leading '/whattoeat' from the redirectTo path to avoid duplicates
      if (path.startsWith('/whattoeat')) {
        path = path.replace(/^\/whattoeat/, '');
      }
      
      // Always start with a slash
      if (!path.startsWith('/')) {
        path = '/' + path;
      }
      
      // Final redirect URL with single base path
      const redirectUrl = `/whattoeat${path}`;
      
      console.log(`[AuthWrapper] Redirecting to: ${redirectUrl}`);
      router.push(redirectUrl);
    }
  }, [loading, currentUser, redirectIfNotAuthenticated, redirectTo, router]);

  // Show loading state
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

  // If user is authenticated or we don't need authentication
  if (currentUser || !redirectIfNotAuthenticated) {
    return <>{children}</>;
  }

  // Show redirect state
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-emerald-600" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Redirecting...</p>
      </div>
    </div>
  );
}