'use client';

import { useEffect, ReactNode, useState } from 'react';
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
  const [redirecting, setRedirecting] = useState(false);
  const [hasCompletedCheck, setHasCompletedCheck] = useState(false);

  console.log(`[AuthWrapper] Render Check - loading: ${loading}, user: ${!!currentUser}, redirectRequired: ${redirectIfNotAuthenticated}`);

  useEffect(() => {
    // Safety timeout - ensure we don't get stuck loading
    const timeout = setTimeout(() => {
      if (!hasCompletedCheck) {
        console.log("[AuthWrapper] Safety timeout - forcing completion of auth check");
        setHasCompletedCheck(true);
      }
    }, 6000); // 6 seconds
    
    // Exit early if still loading and timeout hasn't triggered
    if (loading && !hasCompletedCheck) {
      return () => clearTimeout(timeout);
    }
    
    // If we've completed auth check or loading is done
    clearTimeout(timeout);
    setHasCompletedCheck(true);
    
    if (!currentUser && redirectIfNotAuthenticated && !redirecting) {
      setRedirecting(true);
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/whattoeat';
      const redirectUrl = `${basePath}${redirectTo.startsWith('/') ? redirectTo : '/' + redirectTo}`;
      console.log(`[AuthWrapper] Auth complete, no user. Redirecting to: ${redirectUrl}`);
      router.push(redirectUrl);
    } else {
      console.log(`[AuthWrapper] Auth complete. User ${currentUser ? 'exists' : 'does not exist'}. Redirect ${redirectIfNotAuthenticated ? 'was required' : 'not required'}.`);
    }
    
    return () => clearTimeout(timeout);
  }, [loading, currentUser, redirectIfNotAuthenticated, redirectTo, router, redirecting, hasCompletedCheck]);

  // If still loading and under timeout, show loading indicator
  if ((loading && !hasCompletedCheck) || (redirecting && redirectIfNotAuthenticated && !currentUser)) {
    console.log("[AuthWrapper] Rendering loader - auth still in progress");
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {redirecting ? "Redirecting..." : "Verifying Access..."}
          </p>
        </div>
      </div>
    );
  }

  // At this point, either:
  // 1. Auth is complete and user exists
  // 2. Auth is complete, user doesn't exist, but redirect isn't required
  // 3. Safety timeout triggered
  console.log("[AuthWrapper] Rendering children - auth completed or timeout triggered");
  return <>{children}</>;
}