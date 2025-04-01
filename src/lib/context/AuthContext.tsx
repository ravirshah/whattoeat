'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from 'firebase/auth';
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

  // Single, focused effect to handle auth state
  useEffect(() => {
    console.log("[AuthContext] Setting up auth state listener");
    
    // Create a direct subscription to Firebase's auth state
    const unsubscribe = auth.onAuthStateChanged(
      (user) => {
        console.log("[AuthContext] Auth state updated:", user ? `User: ${user.uid}` : "No user");
        setCurrentUser(user);
        setLoading(false);
      },
      (error) => {
        console.error("[AuthContext] Auth state error:", error);
        setLoading(false);
      }
    );
    
    // Clean up subscription
    return () => {
      console.log("[AuthContext] Cleaning up auth state listener");
      unsubscribe();
    };
  }, []); // Empty dependency array = run only once

  console.log(`[AuthContext] Rendering with loading=${loading}, user=${currentUser?.uid || "null"}`);

  return (
    <AuthContext.Provider value={{ currentUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};