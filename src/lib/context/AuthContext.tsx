'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, getAuth } from 'firebase/auth';
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("[AuthContext] useEffect triggered.");
    
    // Add safety timeout
    const safetyTimeoutId = setTimeout(() => {
      console.log("[AuthContext] Safety timeout triggered. Force completing auth check.");
      setLoading(false);
    }, 5000); // 5 seconds timeout
    
    try {
      const auth = getAuth(app);
      console.log("[AuthContext] Auth instance:", auth);
      
      // Direct check for current user first
      const currentUser = auth.currentUser;
      console.log("[AuthContext] Direct currentUser check:", currentUser?.uid || "No user");
      
      if (currentUser) {
        console.log("[AuthContext] User already authenticated, skipping listener");
        setCurrentUser(currentUser);
        setLoading(false);
        clearTimeout(safetyTimeoutId);
        return;
      }
      
      // Set up auth state listener
      const unsubscribe = auth.onAuthStateChanged((user) => {
        console.log("[AuthContext] Auth state changed:", user?.uid || "No user");
        setCurrentUser(user);
        setLoading(false);
        clearTimeout(safetyTimeoutId);
      }, (error) => {
        console.error("[AuthContext] Auth state change error:", error);
        setLoading(false);
        clearTimeout(safetyTimeoutId);
      });
      
      return () => {
        unsubscribe();
        clearTimeout(safetyTimeoutId);
      };
    } catch (error) {
      console.error("[AuthContext] Error in auth setup:", error);
      setLoading(false);
      clearTimeout(safetyTimeoutId);
    }
  }, []);

  console.log(`[AuthContext] Current state - Loading: ${loading}, User: ${!!currentUser}`);
  
  return (
    <AuthContext.Provider value={{ currentUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};