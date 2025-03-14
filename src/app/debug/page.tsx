'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import axios from 'axios';
import { getApiUrl } from '@/lib/utils';
export default function DebugPage() {
  const { currentUser, loading } = useAuth();
  
  const [authTestResult, setAuthTestResult] = useState<any>(null);
  const [authTestError, setAuthTestError] = useState<string | null>(null);
  const [authTestLoading, setAuthTestLoading] = useState(false);
  
  const [geminiTestResult, setGeminiTestResult] = useState<any>(null);
  const [geminiTestError, setGeminiTestError] = useState<string | null>(null);
  const [geminiTestLoading, setGeminiTestLoading] = useState(false);
  
  const [fullTestResult, setFullTestResult] = useState<any>(null);
  const [fullTestError, setFullTestError] = useState<string | null>(null);
  const [fullTestLoading, setFullTestLoading] = useState(false);

  // Test Firebase Auth
  const testFirebaseAuth = async () => {
    if (!currentUser) {
      setAuthTestError('You must be logged in to test authentication');
      return;
    }
    
    setAuthTestLoading(true);
    setAuthTestResult(null);
    setAuthTestError(null);
    
    try {
      // Get user token
      const token = await currentUser.getIdToken();
      
      // Call debug auth API
      const response = await axios.post('/whattoeat/api/debug-auth', {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setAuthTestResult(response.data);
    } catch (error: any) {
      console.error('Auth test error:', error);
      
      let errorMsg = "Auth test failed";
      if (error.response) {
        errorMsg += `: ${error.response.status} ${error.response.statusText}`;
        if (error.response.data && error.response.data.error) {
          errorMsg += ` - ${error.response.data.error}`;
        }
        if (error.response.data && error.response.data.details) {
          errorMsg += `. Details: ${error.response.data.details}`;
        }
      } else if (error.request) {
        errorMsg += ": No response received from server";
      } else {
        errorMsg += `: ${error.message}`;
      }
      
      setAuthTestError(errorMsg);
    } finally {
      setAuthTestLoading(false);
    }
  };
  
  // Test Gemini API
  const testGeminiApi = async () => {
    setGeminiTestLoading(true);
    setGeminiTestResult(null);
    setGeminiTestError(null);
    
    try {
      // Call debug Gemini API
      const response = await axios.post(getApiUrl('/api/debug-gemini'), {});
      
      setGeminiTestResult(response.data);
    } catch (error: any) {
      console.error('Gemini test error:', error);
      
      let errorMsg = "Gemini test failed";
      if (error.response) {
        errorMsg += `: ${error.response.status} ${error.response.statusText}`;
        if (error.response.data && error.response.data.error) {
          errorMsg += ` - ${error.response.data.error}`;
        }
        if (error.response.data && error.response.data.details) {
          errorMsg += `. Details: ${error.response.data.details}`;
        }
      } else if (error.request) {
        errorMsg += ": No response received from server";
      } else {
        errorMsg += `: ${error.message}`;
      }
      
      setGeminiTestError(errorMsg);
    } finally {
      setGeminiTestLoading(false);
    }
  };
  
  // Test Full Recipe Generation
  const testFullRecipeGeneration = async () => {
    if (!currentUser) {
      setFullTestError('You must be logged in to test recipe generation');
      return;
    }
    
    setFullTestLoading(true);
    setFullTestResult(null);
    setFullTestError(null);
    
    try {
      // Get user token
      const token = await currentUser.getIdToken();
      
      // Call generate-recipes API with minimal data
      const response = await axios.post(getApiUrl('/api/generate-recipes'), 
        {
          ingredients: ['chicken', 'potatoes', 'carrots'],
          equipment: ['oven', 'pan'],
          staples: ['salt', 'pepper', 'oil'],
          dietaryPrefs: []
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          timeout: 30000 // 30-second timeout
        }
      );
      
      setFullTestResult(response.data);
    } catch (error: any) {
      console.error('Full test error:', error);
      
      let errorMsg = "Recipe generation test failed";
      if (error.response) {
        errorMsg += `: ${error.response.status} ${error.response.statusText}`;
        if (error.response.data && error.response.data.error) {
          errorMsg += ` - ${error.response.data.error}`;
        }
        if (error.response.data && error.response.data.details) {
          errorMsg += `. Details: ${error.response.data.details}`;
        }
      } else if (error.request) {
        errorMsg += ": No response received from server";
      } else {
        errorMsg += `: ${error.message}`;
      }
      
      setFullTestError(errorMsg);
    } finally {
      setFullTestLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-white">
          API Debugging Page
        </h1>
        
        <div className="mb-8">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Firebase Authentication Test</h2>
            
            <button
              onClick={testFirebaseAuth}
              disabled={authTestLoading || !currentUser}
              className="mb-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50"
            >
              {authTestLoading ? 'Testing...' : 'Test Firebase Auth'}
            </button>
            
            {!currentUser && (
              <div className="mb-4 p-3 bg-yellow-100 text-yellow-700 rounded-md">
                Please log in to test Firebase authentication
              </div>
            )}
            
            {authTestError && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                <p className="font-semibold">Error:</p>
                <p>{authTestError}</p>
              </div>
            )}
            
            {authTestResult && (
              <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
                <p className="font-semibold">Success:</p>
                <pre className="mt-2 text-sm overflow-auto">
                  {JSON.stringify(authTestResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
        
        <div className="mb-8">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Gemini API Test</h2>
            
            <button
              onClick={testGeminiApi}
              disabled={geminiTestLoading}
              className="mb-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none disabled:opacity-50"
            >
              {geminiTestLoading ? 'Testing...' : 'Test Gemini API'}
            </button>
            
            {geminiTestError && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                <p className="font-semibold">Error:</p>
                <p>{geminiTestError}</p>
              </div>
            )}
            
            {geminiTestResult && (
              <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
                <p className="font-semibold">Success:</p>
                <pre className="mt-2 text-sm overflow-auto">
                  {JSON.stringify(geminiTestResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
        
        <div className="mb-8">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Full Recipe Generation Test</h2>
            
            <button
              onClick={testFullRecipeGeneration}
              disabled={fullTestLoading || !currentUser}
              className="mb-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none disabled:opacity-50"
            >
              {fullTestLoading ? 'Testing...' : 'Test Recipe Generation'}
            </button>
            
            {!currentUser && (
              <div className="mb-4 p-3 bg-yellow-100 text-yellow-700 rounded-md">
                Please log in to test recipe generation
              </div>
            )}
            
            {fullTestError && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                <p className="font-semibold">Error:</p>
                <p>{fullTestError}</p>
              </div>
            )}
            
            {fullTestResult && (
              <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
                <p className="font-semibold">Success:</p>
                <pre className="mt-2 text-sm overflow-auto">
                  {JSON.stringify(fullTestResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}