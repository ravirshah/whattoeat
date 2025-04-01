// src/lib/context/AuthContext.tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User, getAuth, Auth } from 'firebase/auth';
import { app } from '../firebase';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

console.log("[AuthContext] Module loaded.");

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [initialAuthCheckComplete, setInitialAuthCheckComplete] = useState(false);

  useEffect(() => {
    console.log("[AuthContext] useEffect triggered.");
    
    // Add safety timeout to prevent infinite loading
    const safetyTimeoutId = setTimeout(() => {
      console.log("[AuthContext] Safety timeout triggered after 10 seconds. Force completing auth check.");
      if (!initialAuthCheckComplete) {
        setInitialAuthCheckComplete(true);
      }
    }, 10000); // 10 seconds timeout
    
    let authInstance: Auth;
    try {
      authInstance = getAuth(app);
      console.log("[AuthContext] Successfully obtained Auth instance.");
    } catch (error) {
      console.error("[AuthContext] FATAL: Failed to get Auth instance:", error);
      setInitialAuthCheckComplete(true);
      clearTimeout(safetyTimeoutId);
      return;
    }

    console.log("[AuthContext] Attaching onAuthStateChanged listener...");
    let isSubscribed = true;

    try {
      const unsubscribe = onAuthStateChanged(authInstance,
        (user) => {
          if (!isSubscribed) {
            console.log("[AuthContext] Listener success callback fired AFTER unmount. Ignoring.");
            return;
          }
          console.log("[AuthContext] Listener success callback executed.", user ? `User ID: ${user.uid}` : "No user");
          setCurrentUser(user);
          setInitialAuthCheckComplete(true);
          clearTimeout(safetyTimeoutId);
        },
        (error) => {
          if (!isSubscribed) {
            console.log("[AuthContext] Listener error callback fired AFTER unmount. Ignoring.");
            return;
          }
          console.error("[AuthContext] Listener error callback executed:", error);
          setCurrentUser(null);
          setInitialAuthCheckComplete(true);
          clearTimeout(safetyTimeoutId);
        }
      );

      console.log("[AuthContext] Listener attached.");

      return () => {
        console.log("[AuthContext] useEffect cleanup: Unsubscribing...");
        isSubscribed = false;
        unsubscribe();
        clearTimeout(safetyTimeoutId);
      };
    } catch (error) {
      console.error("[AuthContext] Error attaching auth state listener:", error);
      setInitialAuthCheckComplete(true);
      clearTimeout(safetyTimeoutId);
      return;
    }
  }, []);

  const loading = !initialAuthCheckComplete;

  const value = { currentUser, loading };

  console.log(`[AuthContext] Rendering Provider - Derived Loading: ${loading}, User: ${!!currentUser}, CheckComplete: ${initialAuthCheckComplete}`);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};