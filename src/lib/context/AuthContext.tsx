// src/lib/context/AuthContext.tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User, getAuth, Auth } from 'firebase/auth'; // Import getAuth
import { app } from '../firebase'; // Import the initialized FirebaseApp instance

interface AuthContextType {
  currentUser: User | null;
  loading: boolean; // True = initial auth state unknown; False = initial state known
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true, // Start loading
});

export const useAuth = () => useContext(AuthContext);

console.log("[AuthContext] Module loaded.");

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  // State specifically for whether the listener setup is complete
  const [initialAuthCheckComplete, setInitialAuthCheckComplete] = useState(false);

  useEffect(() => {
    console.log("[AuthContext] useEffect triggered.");
    
    let authInstance: Auth;
    try {
      // Get the Auth instance directly using the initialized app
      authInstance = getAuth(app); 
      console.log("[AuthContext] Successfully obtained Auth instance.");
    } catch (error) {
        console.error("[AuthContext] FATAL: Failed to get Auth instance:", error);
        setInitialAuthCheckComplete(true); // Mark as complete (failed)
        return; // Stop
    }

    console.log("[AuthContext] Attaching onAuthStateChanged listener...");
    let isSubscribed = true; // Prevent state updates after unmount

    const unsubscribe = onAuthStateChanged(authInstance, // Use the obtained instance
      (user) => {
        // SUCCESS CALLBACK
        if (!isSubscribed) {
          console.log("[AuthContext] Listener success callback fired AFTER unmount. Ignoring.");
          return;
        }
        console.log("[AuthContext] Listener success callback executed.", user ? `User ID: ${user.uid}` : "No user");
        setCurrentUser(user);
        setInitialAuthCheckComplete(true); // Mark check as complete
      },
      (error) => {
        // ERROR CALLBACK
        if (!isSubscribed) {
          console.log("[AuthContext] Listener error callback fired AFTER unmount. Ignoring.");
          return;
        }
        console.error("[AuthContext] Listener error callback executed:", error);
        setCurrentUser(null);
        setInitialAuthCheckComplete(true); // Mark check as complete (failed)
      }
    );

    console.log("[AuthContext] Listener attached.");

    // Cleanup function
    return () => {
      console.log("[AuthContext] useEffect cleanup: Unsubscribing...");
      isSubscribed = false;
      unsubscribe();
    };

    // Run only once on mount, as we get the auth instance inside.
  }, []); // Empty dependency array

  // Derive the public 'loading' state based on whether the initial check completed
  const loading = !initialAuthCheckComplete;

  const value = { currentUser, loading };

  console.log(`[AuthContext] Rendering Provider - Derived Loading: ${loading}, User: ${!!currentUser}, CheckComplete: ${initialAuthCheckComplete}`);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};