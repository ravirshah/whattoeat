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
    
    // Safety timeout - 5 seconds maximum for auth to resolve
    const timeoutId = setTimeout(() => {
      console.log("[AuthContext] Safety timeout triggered - forcing auth complete");
      setLoading(false);
    }, 5000);
    
    try {
      // Check if we already have a user
      if (auth.currentUser) {
        console.log("[AuthContext] Found existing user:", auth.currentUser.uid);
        setCurrentUser(auth.currentUser);
        setLoading(false);
        clearTimeout(timeoutId);
        return () => {};
      }
      
      // Auth state listener for changes
      const unsubscribe = onAuthStateChanged(auth, 
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
      
      return () => {
        clearTimeout(timeoutId);
        unsubscribe();
      };
    } catch (error) {
      console.error("[AuthContext] Setup error:", error);
      setLoading(false);
      clearTimeout(timeoutId);
      return () => {};
    }
  }, []);

  // Debug current state
  console.log(`[AuthContext] State - Loading: ${loading}, User: ${currentUser?.uid || "null"}`);

  return (
    <AuthContext.Provider value={{ currentUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};