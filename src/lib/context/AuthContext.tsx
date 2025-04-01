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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("Setting up auth state listener");
    
    // Add a safety timeout to prevent infinite loading
    const safetyTimeout = setTimeout(() => {
      if (loading) {
        console.log("Auth state determination timed out after 10s, forcing loading to false");
        setLoading(false);
      }
    }, 10000);
    
    let unsubscribe: () => void;
    
    try {
      unsubscribe = onAuthStateChanged(auth, (user) => {
        console.log("Auth state changed:", user ? `User: ${user.uid}` : "No user");
        setCurrentUser(user);
        setLoading(false);
        clearTimeout(safetyTimeout);
      }, (error) => {
        console.error("Auth state change error:", error);
        setLoading(false);
        clearTimeout(safetyTimeout);
      });
    } catch (error) {
      console.error("Error setting up auth listener:", error);
      setLoading(false);
      clearTimeout(safetyTimeout);
      return () => {};
    }

    return () => {
      clearTimeout(safetyTimeout);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const value = {
    currentUser,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};