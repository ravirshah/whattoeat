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
    
    // Important: first check if Firebase thinks we're already logged in
    if (auth && auth.currentUser) {
      console.log("[AuthContext] Existing user found:", auth.currentUser.uid);
      setCurrentUser(auth.currentUser);
      setInitialAuthCheckComplete(true);
      return; // Exit early, no need for listener
    }
    
    // Track component mount state
    let isMounted = true;
    
    try {
      console.log("[AuthContext] Setting up auth state listener");
      const unsubscribe = onAuthStateChanged(auth, 
        (user) => {
          console.log("[AuthContext] Auth state changed:", user?.uid || "No user");
          if (isMounted) {
            setCurrentUser(user);
            setInitialAuthCheckComplete(true);
          }
        }, 
        (error) => {
          console.error("[AuthContext] Auth error:", error);
          if (isMounted) {
            setInitialAuthCheckComplete(true);
          }
        }
      );
      
      // Critical cleanup
      return () => {
        console.log("[AuthContext] Cleanup function called");
        isMounted = false;
        unsubscribe();
      };
    } catch (error) {
      console.error("[AuthContext] Error setting up auth listener:", error);
      // Still mark as complete on error
      setInitialAuthCheckComplete(true);
      return () => {};
    }
  }, []); // Empty dependency array = run once only

  // Derive loading state from initialAuthCheckComplete
  const loading = !initialAuthCheckComplete;

  // Log state changes to track the issue
  console.log(`[AuthContext] Current state - loading: ${loading}, user: ${currentUser?.uid || "null"}, initialCheck: ${initialAuthCheckComplete}`);

  return <AuthContext.Provider value={{ currentUser, loading }}>{children}</AuthContext.Provider>;
};