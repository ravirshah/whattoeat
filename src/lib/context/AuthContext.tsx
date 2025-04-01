// src/lib/context/AuthContext.tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../firebase'; // Assuming 'auth' is correctly initialized

// --- Global State Management --- 

// State stored outside React lifecycle
let globalUser: User | null = null;
let globalInitialAuthCheckComplete = false; 

// Simple Pub/Sub for notifying React components
const authSubscribers = new Set<() => void>();

function notifyAuthSubscribers() {
  console.log(`[AuthContext-Global] Notifying ${authSubscribers.size} subscribers.`);
  authSubscribers.forEach(callback => callback());
}

// Attach the listener *once* globally
console.log("[AuthContext-Global] Setting up global onAuthStateChanged listener...");
onAuthStateChanged(auth, 
  (user) => {
    // Success callback
    console.log("[AuthContext-Global] Listener success callback executed.", user ? `User ID: ${user.uid}` : "No user");
    globalUser = user;
    if (!globalInitialAuthCheckComplete) {
      console.log("[AuthContext-Global] Initial auth check complete.");
      globalInitialAuthCheckComplete = true;
    }
    notifyAuthSubscribers();
  },
  (error) => {
    // Error callback
    console.error("[AuthContext-Global] Listener error callback executed:", error);
    globalUser = null;
    if (!globalInitialAuthCheckComplete) {
      console.log("[AuthContext-Global] Initial auth check complete (due to error).", );
      globalInitialAuthCheckComplete = true;
    }
    notifyAuthSubscribers();
  }
);
console.log("[AuthContext-Global] Global listener attached.");

// Pre-populate global state if user is already known synchronously (e.g., SSR hydration)
// Note: This might run before the async listener fires the first time
if (auth.currentUser && !globalInitialAuthCheckComplete) {
  console.log("[AuthContext-Global] Pre-populating global state with synchronous currentUser:", auth.currentUser.uid);
  globalUser = auth.currentUser;
  // We cannot be *sure* this is the final initial state, so don't set globalInitialAuthCheckComplete here.
  // Let the async listener confirm the initial state definitively.
}

// --- React Context --- 

interface AuthContextType {
  currentUser: User | null;
  loading: boolean; // True until globalInitialAuthCheckComplete is true
}

const AuthContext = createContext<AuthContextType>({
  currentUser: globalUser, // Initial value from global
  loading: !globalInitialAuthCheckComplete, // Initial value from global
});

export const useAuth = () => useContext(AuthContext);

console.log("[AuthContext] React Module loaded.");

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // React state, initialized from global state
  const [currentUser, setCurrentUser] = useState<User | null>(globalUser);
  const [loading, setLoading] = useState<boolean>(!globalInitialAuthCheckComplete);

  useEffect(() => {
    // This function will run whenever the global state changes (via notification)
    const handleAuthChange = () => {
      console.log("[AuthContext-Provider] handleAuthChange triggered by notification.");
      // Update React state from global state
      setCurrentUser(globalUser);
      setLoading(!globalInitialAuthCheckComplete); 
    };

    // Initial sync on mount, in case global state changed between module load and mount
    handleAuthChange(); 

    // Subscribe to future changes
    console.log("[AuthContext-Provider] Subscribing to global notifications.");
    authSubscribers.add(handleAuthChange);

    // Cleanup: Unsubscribe on unmount
    return () => {
      console.log("[AuthContext-Provider] Unsubscribing from global notifications.");
      authSubscribers.delete(handleAuthChange);
    };
  }, []); // Run subscription effect only once on mount

  const value = { currentUser, loading };

  console.log(`[AuthContext-Provider] Rendering - Loading: ${loading}, User: ${!!currentUser}`);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};