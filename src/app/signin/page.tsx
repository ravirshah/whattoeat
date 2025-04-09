'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signInWithEmail, signInWithGoogle } from '@/lib/auth';
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

  // Check if we're coming from a specific page (optional, keep if needed)
  const fromGenerate = searchParams?.get('from') === 'generate';

  useEffect(() => {
    // Log if redirected from generate page
    if (fromGenerate) {
      console.log(`[SignIn] Page loaded, redirect source: generate`);
    }
  }, [fromGenerate]);

  // Navigate after successful sign-in
  const handleSuccessfulSignIn = () => {
    console.log(`[SignIn] Sign-in process successful, navigating to /generate`);
    // Navigate programmatically to the generate page
    // Use replace to avoid adding the sign-in page to history after successful login
    router.replace('/generate');
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    console.log(`[SignIn] Attempting to sign in with email: ${email}`);

    try {
      // Call the auth function
      await signInWithEmail(email, password);
      // If successful, Firebase listener in AuthContext will update the state.
      // Navigate after the promise resolves.
      console.log("[SignIn] Email sign-in function succeeded.");
      handleSuccessfulSignIn();
    } catch (error: any) {
      console.error("[SignIn] Sign in error:", error);
      setLoading(false); // Stop loading on error

      // Provide user-friendly error messages
      const errorCode = error.code;
      let errorMessage = 'Failed to sign in. Please check your credentials.'; // Default message

      if (errorCode === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format.';
      } else if (errorCode === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled.';
      } else if (errorCode === 'auth/user-not-found' || errorCode === 'auth/invalid-credential') {
        // Treat user-not-found and invalid-credential (includes wrong password) similarly
        errorMessage = 'Incorrect email or password.';
      } else if (errorCode === 'auth/wrong-password') { // Keep specific for potential future use
        errorMessage = 'Incorrect password.';
      }

      setError(errorMessage);
    }
    // Removed finally block, setLoading(false) handled in success/error paths
  };

  const handleGoogleSignIn = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setError(''); // Clear previous errors
    setLoading(true);
    console.log("[SignIn] Attempting Google sign-in");

    try {
      const success = await signInWithGoogle();
      // If successful, Firebase listener handles state update.
      if (success) {
        console.log("[SignIn] Google sign-in function succeeded.");
        handleSuccessfulSignIn();
      } else {
        // signInWithGoogle internally handles errors like popup closed
        console.log("[SignIn] Google sign-in did not complete successfully (e.g., popup closed).");
        setLoading(false); // Reset loading state if popup was closed
      }
    } catch (error) {
      // Catch unexpected errors from signInWithGoogle (though it aims to handle them internally)
      console.error("Error during Google sign-in attempt:", error);
      setLoading(false);
      setError("Failed to sign in with Google. Please try again.");
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Sign in</CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access your recipes
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
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {/* Link to password reset - ensure this page exists */}
                {/* <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-500 dark:hover:text-emerald-400"
                >
                  Forgot password?
                </Link> */}
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : 'Sign in'}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                Or continue with
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            disabled={loading}
            onClick={handleGoogleSignIn}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <svg className="mr-2 h-5 w-5" aria-hidden="true" viewBox="0 0 24 24">
                <path
                  d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 1 1 0-12.064 5.963 5.963 0 0 1 4.202 1.642l2.904-2.906A9.996 9.996 0 0 0 12.545 2C6.839 2 2.25 6.586 2.25 12.294a10.244 10.244 0 0 0 10.295 10.294c8.025 0 10.205-7.426 9.504-12.349z"
                  fill="#4285F4"
                />
              </svg>
            )}
            Google
          </Button>
        </CardContent>

        <CardFooter className="flex justify-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Don't have an account?{' '}
            <Link
              href="/register"
              className="font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-500 dark:hover:text-emerald-400"
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
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md p-8">
        <div className="flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      </Card>
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
