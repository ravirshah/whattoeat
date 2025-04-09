'use client';

import { useEffect, useState, ReactNode, Suspense } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { usePathname, useRouter } from 'next/navigation'; // Import useRouter
import { Loader2 } from 'lucide-react';

interface AuthWrapperProps {
  children: ReactNode;
  // Define explicit types for pages
  pageType: 'public' | 'protected' | 'auth'; // e.g., landing | generate | signin
}

// Component to handle pathname with suspense
function AuthWrapperContent({
  children,
  pageType
}: AuthWrapperProps) {
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname(); // Get current path
  const [isRedirecting, setIsRedirecting] = useState(false); // Track redirection state

  useEffect(() => {
    // Don't do anything while auth is loading, unless it takes too long
    if (authLoading) {
      console.log(`[AuthWrapper] Auth state loading for path: ${pathname}`);
      // Optional: Implement a timeout here if loading takes too long
      // const timer = setTimeout(() => { /* handle timeout */ }, 5000);
      // return () => clearTimeout(timer);
      return; 
    }

    // Auth state is resolved (loading is false)
    console.log(`[AuthWrapper] Auth state resolved for path: ${pathname}. User: ${!!currentUser}, PageType: ${pageType}`);

    // --- Redirection Logic --- 
    let shouldRedirect = false;
    let redirectTarget: string | null = null;

    // 1. Trying to access a PROTECTED page (e.g., /generate) WITHOUT a user
    if (pageType === 'protected' && !currentUser) {
      console.log("[AuthWrapper] Accessing protected route without user. Redirecting to signin.");
      shouldRedirect = true;
      // Add current path as query param for redirecting back after login
      redirectTarget = `/signin?from=${encodeURIComponent(pathname || '')}`;
    }

    // 2. Trying to access an AUTH page (e.g., /signin, /register) WITH a user
    if (pageType === 'auth' && currentUser) {
      console.log("[AuthWrapper] Accessing auth route with user. Redirecting to home (or /generate).");
      shouldRedirect = true;
      // Redirect to a default logged-in page, e.g., /generate or /
      redirectTarget = '/generate'; // Or maybe just '/' depending on desired flow
    }

    // Execute redirect if needed and not already redirecting
    if (shouldRedirect && redirectTarget && !isRedirecting) {
        console.log(`[AuthWrapper] Triggering redirect to: ${redirectTarget}`);
        setIsRedirecting(true);
        // Use router.replace for client-side navigation
        router.replace(redirectTarget);
    }

  }, [authLoading, currentUser, pageType, router, pathname, isRedirecting]);

  // --- Render Logic --- 

  // Show loader if auth is loading OR if we are actively redirecting
  if (authLoading || isRedirecting) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isRedirecting ? 'Redirecting...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  // If we reach here, auth is resolved and no redirection is needed *for this state*
  // Render the children
  // Example: If on protected page, currentUser MUST exist by now.
  // Example: If on auth page, currentUser MUST NOT exist by now.
  // Example: If on public page, render regardless of user state.
  return <>{children}</>;
}

// Fallback for Suspense
function AuthWrapperFallback() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-emerald-600" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading Page...</p>
      </div>
    </div>
  );
}

// Export the main wrapper component
export default function AuthWrapper({
  children,
  pageType
}: AuthWrapperProps) {
  return (
    <Suspense fallback={<AuthWrapperFallback />}>
      <AuthWrapperContent pageType={pageType}>
        {children}
      </AuthWrapperContent>
    </Suspense>
  );
}
