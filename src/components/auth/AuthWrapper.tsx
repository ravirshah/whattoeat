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
  const [waitExpired, setWaitExpired] = useState(false);

  console.log(`[AuthWrapper] Render Check - loading: ${loading}, user: ${!!currentUser}, redirectRequired: ${redirectIfNotAuthenticated}`);

  // Add safety timeout for AuthWrapper
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.log("[AuthWrapper] Maximum wait time exceeded, proceeding anyway");
        setWaitExpired(true);
      }
    }, 6000); // 6 seconds
    
    return () => clearTimeout(timeoutId);
  }, [loading]);

  // Handle redirection
  useEffect(() => {
    if ((!loading || waitExpired) && !currentUser && redirectIfNotAuthenticated) {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/whattoeat';
      const redirectUrl = `${basePath}${redirectTo.startsWith('/') ? redirectTo : '/' + redirectTo}`;
      console.log(`[AuthWrapper] Auth complete, no user. Redirecting to: ${redirectUrl}`);
      router.push(redirectUrl);
    }
  }, [loading, currentUser, redirectIfNotAuthenticated, redirectTo, router, waitExpired]);

  // Show loading indicator only if still loading and timeout not triggered
  if (loading && !waitExpired) {
    console.log("[AuthWrapper] Rendering loader because AuthContext loading = true");
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Verifying Access...</p>
        </div>
      </div>
    );
  }

  // If auth complete or timeout triggered, and can show content
  if (((!loading || waitExpired) && currentUser) || (!redirectIfNotAuthenticated)) {
    console.log("[AuthWrapper] Rendering children");
    return <>{children}</>;
  }

  // Otherwise show simpler loading indicator while redirect happens
  console.log("[AuthWrapper] Rendering redirect loader");
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-emerald-600" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Redirecting...</p>
      </div>
    </div>
  );
}