// src/lib/context/AuthContext.tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User, getAuth } from 'firebase/auth';
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

// Export function to manually set the global user
// This is used by auth.ts for Google sign-in
export function setGlobalAuthUser(user: User | null) {
  console.log("[AuthContext-Global] setGlobalAuthUser called:", user ? `User ID: ${user.uid}` : "No user");
  globalUser = user;
  globalInitialAuthCheckComplete = true; // Also mark auth check as complete when manually setting user
  notifyAuthSubscribers();
}

// Immediately try to get the current user synchronously
// This helps avoid flashes of unauthenticated content
try {
  const currentUser = auth.currentUser;
  if (currentUser) {
    console.log("[AuthContext-Global] Detected synchronous currentUser:", currentUser.uid);
    globalUser = currentUser;
    // We don't set globalInitialAuthCheckComplete yet because we still need the async check
  }
} catch (e) {
  console.error("[AuthContext-Global] Error accessing auth.currentUser:", e);
}

// Use a flag to track if we're on the initial render or not
let isFirstRender = true;

// Attempt to get a fresher token on startup
try {
  if (typeof window !== 'undefined' && auth.currentUser) {
    console.log("[AuthContext-Global] Attempting to get fresher token on initialization");
    auth.currentUser.getIdToken(true)
      .then(() => console.log("[AuthContext-Global] Successfully refreshed token on initialization"))
      .catch(err => console.error("[AuthContext-Global] Failed to refresh token on initialization:", err));
  }
} catch (e) {
  console.error("[AuthContext-Global] Error during token refresh attempt:", e);
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
      
      // If this is the first render and we're in the browser, use a small timeout
      // to ensure subscribers have had a chance to register
      if (isFirstRender && typeof window !== 'undefined') {
        isFirstRender = false;
        console.log("[AuthContext-Global] First render detected, delaying notification to allow subscribers to register");
        setTimeout(() => {
          console.log("[AuthContext-Global] Delayed notification triggered");
          notifyAuthSubscribers();
        }, 100);
        return; // Don't notify immediately
      }
    }
    
    notifyAuthSubscribers();
  },
  (error) => {
    // Error callback
    console.error("[AuthContext-Global] Listener error callback executed:", error);
    globalUser = null;
    
    if (!globalInitialAuthCheckComplete) {
      console.log("[AuthContext-Global] Initial auth check complete (due to error).");
      globalInitialAuthCheckComplete = true;
    }
    
    notifyAuthSubscribers();
  }
);
console.log("[AuthContext-Global] Global listener attached.");

// Set a timeout to force complete the auth check if it takes too long
setTimeout(() => {
  if (!globalInitialAuthCheckComplete) {
    console.log("[AuthContext-Global] Forcing initial auth check completion after timeout");
    globalInitialAuthCheckComplete = true;
    notifyAuthSubscribers();
  }
}, 3000); // 3 second timeout

// --- React Context --- 

interface AuthContextType {
  currentUser: User | null;
  loading: boolean; // True until globalInitialAuthCheckComplete is true
  refreshUser: () => Promise<User | null>; // Function to manually refresh user state
}

const AuthContext = createContext<AuthContextType>({
  currentUser: globalUser, // Initial value from global
  loading: !globalInitialAuthCheckComplete, // Initial value from global
  refreshUser: async () => null,
});

export const useAuth = () => useContext(AuthContext);

console.log("[AuthContext] React Module loaded.");

/**
 * Force refreshes the current user from Firebase auth
 * Useful when there might be a discrepancy between global state and Firebase
 */
async function refreshCurrentUser(): Promise<User | null> {
  try {
    console.log("[AuthContext] Refreshing current user");
    // Force auth to refresh
    const auth = getAuth();
    
    // Wait for auth state to be ready
    console.log("[AuthContext] Waiting for auth state to be ready");
    await auth.authStateReady();
    const freshUser = auth.currentUser;
    
    // Check if the user exists but might not match global state
    const needsGlobalUpdate = (freshUser && !globalUser) || 
                              (!freshUser && globalUser) || 
                              (freshUser && globalUser && freshUser.uid !== globalUser.uid);
    
    if (freshUser) {
      // Log user details for debugging
      console.log(`[AuthContext] Current user found: ${freshUser.uid}, email: ${freshUser.email}, display name: ${freshUser.displayName || 'not set'}`);
      console.log(`[AuthContext] User verified: ${freshUser.emailVerified}, provider: ${freshUser.providerId || 'unknown'}`);
      
      try {
        // Also refresh the token to ensure it's up-to-date
        console.log("[AuthContext] Refreshing token for user:", freshUser.uid);
        const token = await freshUser.getIdToken(true);
        console.log("[AuthContext] Token refreshed successfully, length:", token.length);
      } catch (tokenError) {
        console.error("[AuthContext] Error refreshing token:", tokenError);
        // Continue anyway
      }
      
      try {
        // Also reload the user to ensure we have latest profile info
        await freshUser.reload();
        console.log("[AuthContext] User profile reloaded");
      } catch (reloadError) {
        console.error("[AuthContext] Error reloading user profile:", reloadError);
        // Continue anyway
      }
    } else {
      console.log("[AuthContext] No current user found");
    }
    
    // Update global state if needed
    if (needsGlobalUpdate) {
      console.log("[AuthContext] Detected auth state mismatch, updating global state");
      setGlobalAuthUser(freshUser);
    } else if (freshUser) {
      // Even if no mismatch, notify subscribers to ensure UI updates
      console.log("[AuthContext] No state mismatch, but notifying subscribers anyway to refresh UI");
      notifyAuthSubscribers();
    }
    
    return freshUser;
  } catch (e) {
    console.error("[AuthContext] Error refreshing user:", e);
    return null;
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // React state, initialized from global state
  const [currentUser, setCurrentUser] = useState<User | null>(globalUser);
  const [loading, setLoading] = useState<boolean>(!globalInitialAuthCheckComplete);

  // Function to manually refresh user state
  const refreshUser = async () => {
    const user = await refreshCurrentUser();
    return user;
  };

  useEffect(() => {
    // This function will run whenever the global state changes (via notification)
    const handleAuthChange = () => {
      console.log("[AuthContext-Provider] handleAuthChange triggered by notification.");
      console.log("[AuthContext-Provider] Global state:", globalUser ? `User ID: ${globalUser.uid}` : "No user", "Loading:", !globalInitialAuthCheckComplete);
      
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

  // Check for persisted user on page load/refresh
  useEffect(() => {
    const checkPersistedUser = async () => {
      if (!currentUser) {
        console.log("[AuthContext-Provider] No user in state, checking for persisted user");
        await refreshUser();
      }
    };
    
    checkPersistedUser();
  }, []); // Only run once on mount

  const value = { currentUser, loading, refreshUser };

  console.log(`[AuthContext-Provider] Rendering - Loading: ${loading}, User: ${!!currentUser}`);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};