'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../firebase';

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

    if (!auth) {
      console.error("[AuthContext] FATAL: Firebase auth object is null/undefined in useEffect. Auth will not work.");
      setInitialAuthCheckComplete(true);
      return;
    }

    console.log("[AuthContext] Attaching onAuthStateChanged listener...");
    let isSubscribed = true;

    const unsubscribe = onAuthStateChanged(auth, 
      (user) => {
        if (!isSubscribed) {
          console.log("[AuthContext] Listener success callback fired AFTER unmount. Ignoring.");
          return;
        }
        console.log("[AuthContext] Listener success callback executed.", user ? `User ID: ${user.uid}` : "No user");
        setCurrentUser(user);
        setInitialAuthCheckComplete(true);
      },
      (error) => {
        if (!isSubscribed) {
          console.log("[AuthContext] Listener error callback fired AFTER unmount. Ignoring.");
          return;
        }
        console.error("[AuthContext] Listener error callback executed:", error);
        setCurrentUser(null);
        setInitialAuthCheckComplete(true);
      }
    );

    console.log("[AuthContext] Listener attached.");

    return () => {
      console.log("[AuthContext] useEffect cleanup: Unsubscribing...");
      isSubscribed = false;
      unsubscribe();
    };

  }, [auth]);

  const loading = !initialAuthCheckComplete;

  const value = { currentUser, loading };

  console.log(`[AuthContext] Rendering Provider - Derived Loading: ${loading}, User: ${!!currentUser}, CheckComplete: ${initialAuthCheckComplete}`);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};