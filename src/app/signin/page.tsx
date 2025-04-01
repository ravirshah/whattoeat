'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signInWithEmail, signInWithGoogle } from '@/lib/auth';
import { useAuth } from '@/lib/context/AuthContext';
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
  const { refreshUser } = useAuth();
  const searchParams = useSearchParams();
  
  // Check if we're coming from the generate page
  const fromGenerate = searchParams?.get('from') === 'generate';
  
  useEffect(() => {
    console.log(`[SignIn] Page loaded, fromGenerate: ${fromGenerate}`);
  }, [fromGenerate]);

  const handleSuccessfulSignIn = async () => {
    // Explicitly refresh the user state in AuthContext
    const user = await refreshUser();
    
    if (!user) {
      console.error("[SignIn] User not available after refresh - something went wrong");
      setError("Sign in succeeded but we couldn't verify your account. Please try again.");
      return;
    }
    
    console.log(`[SignIn] Sign in successful, user: ${user.uid}`);
    
    // Navigate to the appropriate page
    const redirectPath = fromGenerate ? '/generate' : '/generate';
    console.log(`[SignIn] Sign in successful, redirecting to ${redirectPath}`);
    
    // Use direct navigation for most reliable page transition
    // Forcing a complete page reload to ensure auth state is fully updated
    window.location.href = window.location.origin + '/whattoeat' + redirectPath;
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    console.log(`[SignIn] Attempting to sign in with email: ${email}, fromGenerate: ${fromGenerate}`);
  
    try {
      const user = await signInWithEmail(email, password);
      console.log("[SignIn] Sign in successful:", user.uid);
      
      // Use the common success handler
      await handleSuccessfulSignIn();
    } catch (error: any) {
      console.error("[SignIn] Sign in error:", error);
  
      // Try to provide a more user-friendly error message
      const errorCode = error.code;
      let errorMessage = error.message || 'Failed to sign in';
      
      if (errorCode === 'auth/invalid-email') {
        errorMessage = 'Invalid email address format.';
      } else if (errorCode === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled.';
      } else if (errorCode === 'auth/user-not-found') {
        errorMessage = 'No account found with this email.';
      } else if (errorCode === 'auth/wrong-password') {
        errorMessage = 'Incorrect password.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    console.log(`[SignIn] Attempting Google sign in, fromGenerate: ${fromGenerate}`);

    try {
      // Sign in with Google
      const googleUser = await signInWithGoogle();
      console.log(`[SignIn] Google sign in successful: ${googleUser.uid}`);
      
      // Navigate directly after Google sign-in
      const redirectPath = fromGenerate ? '/generate' : '/generate';
      console.log(`[SignIn] Redirecting to ${redirectPath} after Google sign in`);
      
      // Force a full page reload to ensure fresh state
      window.location.href = window.location.origin + '/whattoeat' + redirectPath;
    } catch (error: any) {
      setError(error.message || 'Failed to sign in with Google');
      console.error("[SignIn] Google sign in error:", error);
      setLoading(false);
    }
  };
  
  // For demo/prototype - create a test account
  const handleCreateTestAccount = async () => {
    setEmail('test@example.com');
    setPassword('password123');
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Sign in</CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access your account
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
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link 
                  href="/forgot-password" 
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-500 dark:hover:text-emerald-400"
                >
                  Forgot password?
                </Link>
              </div>
              <Input 
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
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

          {/* For testing purposes */}
          <Button
            variant="ghost"
            className="w-full mt-4 text-sm"
            onClick={handleCreateTestAccount}
          >
            Use test account credentials
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