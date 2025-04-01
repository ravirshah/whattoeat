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
    
    // Direct auth state check first (current state)
    console.log("[AuthContext] Direct currentUser check:", auth.currentUser?.uid || "No user");
    
    // This is critical: If Firebase thinks user is already logged in, update state immediately
    if (auth.currentUser) {
      console.log("[AuthContext] Setting initial user from direct check:", auth.currentUser.uid);
      setCurrentUser(auth.currentUser);
      setLoading(false);
    }
    
    // Safety timeout - don't block app forever if auth is broken
    const safetyTimeout = setTimeout(() => {
      console.log("[AuthContext] Safety timeout triggered - forcing auth complete");
      setLoading(false);
    }, 5000);
    
    let unsubscribed = false;
    
    try {
      // Auth state listener for changes
      const unsubscribe = onAuthStateChanged(auth, 
        (user) => {
          if (unsubscribed) return;
          
          console.log("[AuthContext] Auth state changed:", user?.uid || "No user");
          setCurrentUser(user);
          setLoading(false);
          clearTimeout(safetyTimeout);
        }, 
        (error) => {
          if (unsubscribed) return;
          
          console.error("[AuthContext] Auth error:", error);
          setLoading(false);
          clearTimeout(safetyTimeout);
        }
      );
      
      return () => {
        unsubscribed = true;
        clearTimeout(safetyTimeout);
        unsubscribe();
      };
    } catch (error) {
      console.error("[AuthContext] Setup error:", error);
      setLoading(false);
      clearTimeout(safetyTimeout);
      return () => {}; // empty cleanup if setup failed
    }
  }, []);

  // Debug logging
  useEffect(() => {
    console.log(`[AuthContext] State updated - Loading: ${loading}, User: ${currentUser?.uid || "null"}`);
  }, [loading, currentUser]);

  return (
    <AuthContext.Provider value={{ currentUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};