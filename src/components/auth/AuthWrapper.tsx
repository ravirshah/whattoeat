'use client';

import { useEffect, useState, ReactNode } from 'react';
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
  // Safety timeout state to prevent infinite loading
  const [forceShow, setForceShow] = useState(false);

  // Log every render with its state
  console.log(`[AuthWrapper] Render - loading: ${loading}, user: ${!!currentUser}, forceShow: ${forceShow}`);

  // Safety timeout effect - if loading for too long, force show content
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        console.log('[AuthWrapper] Safety timeout triggered - forcing content display');
        setForceShow(true);
      }, 5000); // 5 seconds safety timeout
      
      return () => clearTimeout(timer);
    }
  }, [loading]);

  // Handle redirection with explicit URL instead of router
  useEffect(() => {
    // Only redirect if not loading, no user, and redirection is required
    if (!loading && !currentUser && redirectIfNotAuthenticated) {
      // CRITICAL: Use window.location with ABSOLUTE URL to avoid path resolution issues
      const baseUrl = 'https://whattoeat.sortedbyshah.com/whattoeat';
      const targetPage = redirectTo.startsWith('/') ? redirectTo.substring(1) : redirectTo;
      const absoluteUrl = `${baseUrl}/${targetPage}`;
      
      console.log(`[AuthWrapper] Redirecting to absolute URL: ${absoluteUrl}`);
      window.location.href = absoluteUrl;
    }
  }, [loading, currentUser, redirectIfNotAuthenticated, redirectTo]);

  // If still loading and we haven't hit the safety timeout, show loader
  if (loading && !forceShow) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Verifying Access...</p>
        </div>
      </div>
    );
  }

  // If authenticated, hit safety timeout, or auth not required, show content
  if (currentUser || forceShow || !redirectIfNotAuthenticated) {
    console.log('[AuthWrapper] Showing content because:', 
      currentUser ? 'user is authenticated' : 
      forceShow ? 'safety timeout hit' : 
      'auth not required');
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