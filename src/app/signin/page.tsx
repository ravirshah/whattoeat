// src/app/signin/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithEmail, signInWithGoogle } from '@/lib/auth';
import MainLayout from '@/components/layout/MainLayout';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    console.log("Attempting to sign in with:", email);
  
    try {
      const user = await signInWithEmail(email, password);
      console.log("Sign in successful:", user);
      router.push('/generate');
    } catch (error: any) {
      console.error("Sign in error:", error);
  
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

    try {
      await signInWithGoogle();
      router.push('/generate');
    } catch (error: any) {
      setError(error.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };
  
  // For demo/prototype - create a test account
  const handleCreateTestAccount = async () => {
    setEmail('test@example.com');
    setPassword('password123');
  };

  return (
    <MainLayout>
      <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900 dark:text-white">
            Sign in to your account
          </h2>
        </div>

        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
              {error}
            </div>
          )}
          
          <form className="space-y-6" onSubmit={handleEmailSignIn}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">
                Email address
              </label>
              <div className="mt-2">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-emerald-600 sm:text-sm sm:leading-6"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">
                  Password
                </label>
                <div className="text-sm">
                  <a href="#" className="font-semibold text-emerald-600 hover:text-emerald-500">
                    Forgot password?
                  </a>
                </div>
              </div>
              <div className="mt-2">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-emerald-600 sm:text-sm sm:leading-6"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:bg-emerald-400"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>

          {/* For prototype purposes only */}
          <div className="mt-4">
            <button
              onClick={handleCreateTestAccount}
              className="text-sm text-emerald-600 hover:text-emerald-500"
            >
              Use test account credentials
            </button>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">Or continue with</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="flex w-full justify-center items-center gap-3 rounded-md bg-white dark:bg-gray-800 px-3 py-1.5 text-sm font-semibold leading-6 text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600 disabled:opacity-70"
              >
                <svg className="h-5 w-5" aria-hidden="true" viewBox="0 0 24 24">
                  <path
                    d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 1 1 0-12.064 5.963 5.963 0 0 1 4.202 1.642l2.904-2.906A9.996 9.996 0 0 0 12.545 2C6.839 2 2.25 6.586 2.25 12.294a10.244 10.244 0 0 0 10.295 10.294c8.025 0 10.205-7.426 9.504-12.349z"
                    fill="#4285F4"
                  />
                </svg>
                Google
              </button>
            </div>
          </div>

          <p className="mt-10 text-center text-sm text-gray-500">
            Not a member?{' '}
            <Link href="/register" className="font-semibold leading-6 text-emerald-600 hover:text-emerald-500">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </MainLayout>
  );
}