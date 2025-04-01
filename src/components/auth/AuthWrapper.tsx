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
    console.log(`[AuthWrapper] Effect check - loading: ${loading}, currentUser: ${!!currentUser}`);
    // If auth has finished loading, and there's no user, and we need to redirect
    if (!loading && !currentUser && redirectIfNotAuthenticated) {
      console.log("[AuthWrapper] User not authenticated, redirecting to", redirectTo);
      // Add base path to redirect URL if necessary
      // Assuming redirectTo is like '/signin' and basePath is '/whattoeat'
      // If your signin page is setup correctly under basePath, this might not be needed
      // const redirectUrl = withBasePath(redirectTo); // If using utils function
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/whattoeat';
      const redirectUrl = `${basePath}${redirectTo.startsWith('/') ? redirectTo : '/' + redirectTo}`;
      console.log(`[AuthWrapper] Calculated redirect URL: ${redirectUrl}`);
      router.push(redirectUrl); // Use calculated URL
      setAuthenticated(false); // Explicitly set false on redirect
    } 
    // If auth has finished loading and there IS a user, OR if redirection isn't required
    else if (!loading && (currentUser || !redirectIfNotAuthenticated)) {
      console.log("[AuthWrapper] User authenticated or redirect not required. Setting authenticated true.");
      setAuthenticated(true);
    } else if (loading) {
      console.log("[AuthWrapper] Still loading auth state...");
      // Ensure authenticated is false while loading if redirection is needed
      if (redirectIfNotAuthenticated) {
        setAuthenticated(false);
      }
    }
  }, [currentUser, loading, redirectIfNotAuthenticated, redirectTo, router]);

  // Show loading state ONLY based on the loading prop from useAuth()
  // Also check authenticated status if redirect is required
  if (loading || (redirectIfNotAuthenticated && !authenticated)) {
    console.log(`[AuthWrapper] Rendering loading screen (loading: ${loading}, authenticated: ${authenticated}, redirectRequired: ${redirectIfNotAuthenticated})`);
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Verifying Access...</p>
        </div>
      </div>
    );
  }

  // If we passed the loading condition, render children
  console.log(`[AuthWrapper] Rendering children (loading: ${loading}, authenticated: ${authenticated}, redirectRequired: ${redirectIfNotAuthenticated})`);
  return <>{children}</>;
}