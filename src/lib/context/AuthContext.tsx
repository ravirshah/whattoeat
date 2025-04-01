// src/lib/context/AuthContext.tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { auth } from '../firebase';

// Create a global auth state to bypass React re-render issues
let globalAuthState: { user: User | null } = { user: null };

// Manual auth state setter that we'll export to force updates
export function setGlobalAuthUser(user: User | null) {
  console.log("[AuthContext] Manual auth update:", user?.uid || "null");
  globalAuthState.user = user;
  // Notify all subscribers (implemented below)
  notifyAuthSubscribers();
}

// Simple pub/sub system to notify components of auth changes
const authSubscribers: Function[] = [];
function notifyAuthSubscribers() {
  authSubscribers.forEach(callback => callback(globalAuthState.user));
}

// Check for existing user immediately
if (auth.currentUser) {
  console.log("[AuthContext] Found existing user on init:", auth.currentUser.uid);
  globalAuthState.user = auth.currentUser;
}

// Set up the auth listener at module level (outside React)
auth.onAuthStateChanged((user) => {
  console.log("[AuthContext] Global auth state changed:", user?.uid || "null");
  globalAuthState.user = user;
  notifyAuthSubscribers();
});

// Context type
interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
}

// Create the context
const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: false,
});

export const useAuth = () => useContext(AuthContext);

// Provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authState, setAuthState] = useState<AuthContextType>(() => ({
    // Initialize from global state
    currentUser: globalAuthState.user,
    loading: false
  }));

  // Subscribe to auth changes
  useEffect(() => {
    console.log("[AuthContext] Setting up subscription");
    
    // Update from current global state
    setAuthState({
      currentUser: globalAuthState.user,
      loading: false
    });
    
    // Subscribe to future changes
    function handleAuthChange(user: User | null) {
      console.log("[AuthContext] Subscriber received auth change:", user?.uid || "null");
      setAuthState({
        currentUser: user,
        loading: false
      });
    }
    
    // Add subscriber
    authSubscribers.push(handleAuthChange);
    
    // Cleanup
    return () => {
      const index = authSubscribers.indexOf(handleAuthChange);
      if (index > -1) authSubscribers.splice(index, 1);
    };
  }, []);

  console.log(`[AuthContext] Rendering with user=${authState.currentUser?.uid || "null"}`);
  
  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  );
};