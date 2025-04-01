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
  const [bypassMode, setBypassMode] = useState(false);

  console.log(`[AuthWrapper] Render - loading: ${loading}, user: ${!!currentUser}, bypass: ${bypassMode}`);

  // Emergency fallback - if auth is taking too long, just bypass it
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.log("[AuthWrapper] EMERGENCY BYPASS: Auth taking too long, bypassing completely");
        setBypassMode(true);
      }
    }, 7000); // 7 seconds
    
    return () => clearTimeout(timeoutId);
  }, [loading]);

  // Handle redirection (but only if not in bypass mode)
  useEffect(() => {
    if (!loading && !currentUser && redirectIfNotAuthenticated && !bypassMode) {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/whattoeat';
      const redirectUrl = `${basePath}${redirectTo.startsWith('/') ? redirectTo : '/' + redirectTo}`;
      console.log(`[AuthWrapper] Redirecting to: ${redirectUrl}`);
      router.push(redirectUrl);
    }
  }, [loading, currentUser, redirectIfNotAuthenticated, redirectTo, router, bypassMode]);

  // In bypass mode, just show the content
  if (bypassMode) {
    console.log("[AuthWrapper] Rendering children in bypass mode");
    return <>{children}</>;
  }

  // Still loading, show loader
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

  // Auth complete and user exists or redirect not required
  if (currentUser || !redirectIfNotAuthenticated) {
    console.log("[AuthWrapper] Rendering children - auth complete");
    return <>{children}</>;
  }

  // Auth complete, no user, waiting for redirect
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-emerald-600" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Redirecting...</p>
      </div>
    </div>
  );
}