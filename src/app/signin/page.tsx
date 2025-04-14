'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signInWithEmail, signInWithGoogle } from '@/lib/auth';
import { useAuth } from '@/lib/context/AuthContext'; // Import useAuth
import MainLayout from '@/components/layout/MainLayout';
import { Button, Input, Label, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Alert, AlertDescription } from '@/components/ui';
import { Loader2, AlertCircle } from 'lucide-react';

// Component that uses useSearchParams
function SignInContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentUser, loading: authLoading } = useAuth(); // Get user state

  // Check if we're coming from a specific page
  const fromGenerate = searchParams?.get('from') === 'generate';
  const redirectTo = fromGenerate ? '/generate' : '/'; // Determine redirect target

  // Effect to redirect if user becomes authenticated while on sign-in page
  useEffect(() => {
    // Only redirect if auth is not loading and user exists
    if (!authLoading && currentUser) {
      console.log(`[SignIn] User is already authenticated (${currentUser.uid}), redirecting to ${redirectTo}`);
      router.replace(redirectTo);
    }
    // Dependency array includes currentUser and authLoading to react to auth state changes
  }, [currentUser, authLoading, router, redirectTo]);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    console.log(`[SignIn] Attempting to sign in with email: ${email}`);

    try {
      await signInWithEmail(email, password);
      // **REMOVED:** handleSuccessfulSignIn();
      // AuthContext listener and the useEffect above will handle the redirect.
      console.log("[SignIn] Email sign-in function succeeded. Waiting for AuthContext update.");
      // setLoading(false); // Keep loading until redirect or error
    } catch (error: any) {
      console.error("[SignIn] Email sign-in error:", error);
      setLoading(false); // Stop loading ONLY on error

      const errorCode = error.code;
      let errorMessage = 'Failed to sign in. Please check your credentials.';
      if (errorCode === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format.';
      } else if (errorCode === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled.';
      } else if (errorCode === 'auth/user-not-found' || errorCode === 'auth/invalid-credential') {
        errorMessage = 'Incorrect email or password.';
      }
      setError(errorMessage);
    }
  };

  const handleGoogleSignIn = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    console.log("[SignIn] Attempting Google sign-in");

    try {
      const success = await signInWithGoogle();
      if (success) {
        // **REMOVED:** handleSuccessfulSignIn();
        // AuthContext listener and the useEffect above will handle the redirect.
        console.log("[SignIn] Google sign-in function succeeded. Waiting for AuthContext update.");
        // setLoading(false); // Keep loading until redirect or error
      } else {
        console.log("[SignIn] Google sign-in did not complete (e.g., popup closed).");
        setLoading(false); // Reset loading state if popup was closed or failed in auth lib
      }
    } catch (error) {
      console.error("Error during Google sign-in attempt:", error);
      setLoading(false);
      setError("Failed to sign in with Google. Please try again.");
    }
  };

  // If auth is loading or user is already logged in (and redirecting), show minimal loading
  if (authLoading || currentUser) {
      return (
          <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
      );
  }

  // Render the form only if auth is resolved and no user is logged in
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Sign in</CardTitle>
          <CardDescription className="text-center">
            Enter your credentials or use Google to sign in
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleEmailSignIn} className="space-y-4">
            {/* Email Input */} 
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="hello@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            {/* Password Input */} 
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            {/* Sign In Button */} 
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...</>
              ) : 'Sign in'}
            </Button>
          </form>

          {/* Divider */} 
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          {/* Google Sign In Button */} 
          <Button
            variant="outline"
            className="w-full"
            disabled={loading}
            onClick={handleGoogleSignIn}
          >
            {loading && !error ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</> 
            ) : (
                <svg className="mr-2 h-5 w-5" aria-hidden="true" viewBox="0 0 24 24"> <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 1 1 0-12.064 5.963 5.963 0 0 1 4.202 1.642l2.904-2.906A9.996 9.996 0 0 0 12.545 2C6.839 2 2.25 6.586 2.25 12.294a10.244 10.244 0 0 0 10.295 10.294c8.025 0 10.205-7.426 9.504-12.349z" fill="#4285F4" /> </svg>
            )}
            Google
          </Button>
        </CardContent>

        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link
              href="/register" // Make sure /register route exists
              className="font-medium text-primary hover:underline"
            >
              Register
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

// Loading fallback for Suspense
function SignInFallback() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
    </div>
  );
}

export default function SignIn() {
  return (
    <MainLayout showFooter={false}>
      <Suspense fallback={<SignInFallback />}>
        <SignInContent />
      </Suspense>
    </MainLayout>
  );
}
