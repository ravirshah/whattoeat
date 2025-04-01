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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("[AuthContext] useEffect triggered.");
    
    // Force auth to complete after 5 seconds no matter what
    const timeoutId = setTimeout(() => {
      console.log("[AuthContext] Safety timeout triggered - forcing auth complete");
      setLoading(false);
    }, 5000);
    
    // Check if we already have a user (useful after login/refresh)
    if (auth && auth.currentUser) {
      console.log("[AuthContext] Found existing user:", auth.currentUser.uid);
      setCurrentUser(auth.currentUser);
      setLoading(false);
      clearTimeout(timeoutId);
      return () => {};
    }
    
    // Watch for auth state changes (needed for sign-in/sign-out)
    let unsubscribe = () => {};
    
    try {
      unsubscribe = onAuthStateChanged(auth, 
        (user) => {
          console.log("[AuthContext] Auth state changed:", user?.uid || "No user");
          setCurrentUser(user);
          setLoading(false);
          clearTimeout(timeoutId);
        }, 
        (error) => {
          console.error("[AuthContext] Auth error:", error);
          setLoading(false);
          clearTimeout(timeoutId);
        }
      );
    } catch (error) {
      console.error("[AuthContext] Setup error:", error);
      setLoading(false);
      clearTimeout(timeoutId);
    }
    
    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  // For debugging
  useEffect(() => {
    console.log(`[AuthContext] State updated - Loading: ${loading}, User: ${currentUser?.uid || "null"}`);
  }, [loading, currentUser]);

  return (
    <AuthContext.Provider value={{ currentUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};