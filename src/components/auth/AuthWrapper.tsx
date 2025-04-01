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

  console.log(`[AuthWrapper] Render Check - loading: ${loading}, user: ${!!currentUser}, redirectRequired: ${redirectIfNotAuthenticated}`);

  useEffect(() => {
    if (!loading) {
      if (!currentUser && redirectIfNotAuthenticated) {
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/whattoeat';
        const redirectUrl = `${basePath}${redirectTo.startsWith('/') ? redirectTo : '/' + redirectTo}`;
        console.log(`[AuthWrapper] Auth complete, no user. Redirecting to: ${redirectUrl}`);
        router.push(redirectUrl);
      } else {
        console.log(`[AuthWrapper] Auth complete. User ${currentUser ? 'exists' : 'does not exist'}. Redirect ${redirectIfNotAuthenticated ? 'was required' : 'not required'}. Allowing content render.`);
      }
    }
  }, [loading, currentUser, redirectIfNotAuthenticated, redirectTo, router]);

  if (loading) {
    console.log("[AuthWrapper] Rendering loader because AuthContext loading = true.");
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-emerald-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Verifying Access...</p>
        </div>
      </div>
    );
  }

  if (!loading && (currentUser || !redirectIfNotAuthenticated)) {
    console.log("[AuthWrapper] Rendering children.");
    return <>{children}</>;
  }

  console.log("[AuthWrapper] Conditions met for redirect, waiting for redirect to complete...");
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-emerald-600" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Redirecting...</p>
      </div>
    </div>
  );
}