'use client';

import { useEffect, useState, ReactNode, Suspense } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface AuthWrapperProps {
  children: ReactNode;
  redirectIfNotAuthenticated?: boolean;
  redirectTo?: string;
}

// Component to handle pathname with suspense
function AuthWrapperContent({
  children,
  redirectIfNotAuthenticated = true,
  redirectTo = '/signin'
}: AuthWrapperProps) {
  const { currentUser, loading, refreshUser } = useAuth();
  const pathname = usePathname();
  // Safety timeout state to prevent infinite loading
  const [forceShow, setForceShow] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [refreshAttempted, setRefreshAttempted] = useState(false);

  // Check if current route is generate - we'll be more permissive for this route
  const isGeneratePage = pathname?.includes('/generate') || false;
  const isRecipesPage = pathname?.includes('/recipes') || false;

  // Log every render with its state
  console.log(`[AuthWrapper] Render - loading: ${loading}, user: ${!!currentUser}, path: ${pathname}, forceShow: ${forceShow}, redirecting: ${redirecting}, refreshAttempted: ${refreshAttempted}`);

  // Try to refresh auth state once on initial load if no user is detected
  useEffect(() => {
    const tryRefreshAuth = async () => {
      if (!refreshAttempted) {
        console.log('[AuthWrapper] Attempting to refresh auth state');
        setRefreshAttempted(true);
        try {
          const user = await refreshUser();
          console.log('[AuthWrapper] Auth refresh result:', user ? 'User found' : 'No user found');
        } catch (e) {
          console.error('[AuthWrapper] Error refreshing auth:', e);
        }
      }
    };
    
    tryRefreshAuth();
  }, [refreshUser, refreshAttempted]);

  // Safety timeout effect - if loading for too long, force show content
  // Use shorter timeout for generate page
  useEffect(() => {
    if (loading && !forceShow) {
      const timeoutDuration = isGeneratePage ? 1500 : 3000; // 1.5s for generate, 3s for others
      console.log(`[AuthWrapper] Starting safety timeout (${timeoutDuration}ms)`);
      
      const timer = setTimeout(() => {
        console.log('[AuthWrapper] Safety timeout triggered - forcing content display');
        setForceShow(true);
      }, timeoutDuration);
      
      return () => clearTimeout(timer);
    }
  }, [loading, forceShow, isGeneratePage]);

  // Handle redirection with explicit URL instead of router
  useEffect(() => {
    // For generate and recipes pages, we'll be very permissive
    if (isGeneratePage || isRecipesPage) {
      // Skip redirect completely if on these pages
      console.log(`[AuthWrapper] Skipping auth check for ${isGeneratePage ? 'generate' : 'recipes'} page`);
      return;
    }
    
    // Normal case for other pages
    // Only attempt redirect if:
    // 1. Not loading (or forceShow is true)
    // 2. No current user
    // 3. redirectIfNotAuthenticated is true
    // 4. We haven't already started redirecting
    // 5. We've already attempted a refresh
    const shouldRedirect = (!loading || forceShow) && 
                          !currentUser && 
                          redirectIfNotAuthenticated && 
                          !redirecting &&
                          refreshAttempted;
                          
    if (shouldRedirect) {
      // CRITICAL: Use window.location with ABSOLUTE URL to avoid path resolution issues
      const baseUrl = window.location.origin;
      const targetPage = redirectTo.startsWith('/') ? redirectTo.substring(1) : redirectTo;
      const absoluteUrl = `${baseUrl}/${targetPage}`;
      
      console.log(`[AuthWrapper] Redirecting to absolute URL: ${absoluteUrl}`);
      setRedirecting(true);
      
      // Use a small delay to prevent rapid redirects if there's any state flicker
      setTimeout(() => {
        if (!currentUser) { // Double check we still need to redirect
          window.location.href = absoluteUrl;
        } else {
          setRedirecting(false);
        }
      }, 500);
    }
  }, [loading, currentUser, redirectIfNotAuthenticated, redirectTo, forceShow, redirecting, refreshAttempted, isGeneratePage, isRecipesPage]);

  // For generate and recipes pages
  if (isGeneratePage || isRecipesPage) {
    // For generate page, ALWAYS require authentication
    if (isGeneratePage) {
      // Check if we're still loading
      if (loading && !forceShow) {
        console.log('[AuthWrapper] Still loading auth state for generate page');
        return (
          <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-950">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-emerald-600" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Verifying Access...
              </p>
            </div>
          </div>
        );
      }
      
      // If user is available, show content
      if (currentUser) {
        console.log('[AuthWrapper] User authenticated for generate page, showing content');
        return <>{children}</>;
      }
      
      // If no user after loading is complete or force show is true, redirect
      console.log('[AuthWrapper] User not authenticated for generate page, redirecting to sign in');
      
      // Use direct window.location redirection for reliability
      const baseUrl = window.location.origin;
      window.location.href = `${baseUrl}/signin?from=generate`;
      
      // Show loading while redirecting
      return (
        <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-950">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-emerald-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Redirecting to sign in...
            </p>
          </div>
        </div>
      );
    }
    
    // For recipes pages, we're more permissive
    console.log('[AuthWrapper] Showing content for recipes page');
    return <>{children}</>;
  }

  // If still loading and we haven't hit the safety timeout, show loader
  if ((loading && !forceShow) || (redirecting && !forceShow)) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {redirecting ? 'Redirecting...' : 'Verifying Access...'}
          </p>
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
    // Return children even if redirecting is true, to avoid flash
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

// Fallback for Suspense
function AuthWrapperFallback() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-emerald-600" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

export default function AuthWrapper({
  children,
  redirectIfNotAuthenticated = true,
  redirectTo = '/signin'
}: AuthWrapperProps) {
  return (
    <Suspense fallback={<AuthWrapperFallback />}>
      <AuthWrapperContent
        redirectIfNotAuthenticated={redirectIfNotAuthenticated}
        redirectTo={redirectTo}
      >
        {children}
      </AuthWrapperContent>
    </Suspense>
  );
}