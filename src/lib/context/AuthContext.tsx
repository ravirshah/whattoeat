// src/lib/context/AuthContext.tsx
'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback
} from 'react';
import { onAuthStateChanged, User, getAuth } from 'firebase/auth';
import { auth } from '../firebase'; // Assuming 'auth' is correctly initialized

// Define the shape of the context data
interface AuthContextType {
  currentUser: User | null;
  loading: boolean; // True while checking initial auth state
  refreshUserToken: () => Promise<string | null>; // Function to manually refresh user token
}

// Create the context with default values
const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  refreshUserToken: async () => null,
});

// Custom hook to use the AuthContext
export const useAuth = () => useContext(AuthContext);

console.log("[AuthContext] React Module loaded.");

// AuthProvider component that wraps the application
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true); // Start as loading

  // Function to manually refresh the ID token
  const refreshUserToken = useCallback(async (): Promise<string | null> => {
    const user = auth.currentUser;
    if (user) {
      try {
        console.log("[AuthContext] Forcing token refresh for user:", user.uid);
        const token = await user.getIdToken(true); // Force refresh
        console.log("[AuthContext] Token refreshed successfully.");
        return token;
      } catch (error) {
        console.error("[AuthContext] Error refreshing token:", error);
        // Sign out the user if token refresh fails significantly (e.g., user deleted, disabled)
        // Consider more specific error handling based on Firebase error codes if needed
        await auth.signOut();
        setCurrentUser(null); // Update state immediately
        return null;
      }
    }
    console.log("[AuthContext] refreshUserToken called but no user was found.");
    return null;
  }, []);

  useEffect(() => {
    console.log("[AuthContext] Setting up onAuthStateChanged listener...");

    // Subscribe to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        // Auth state changed
        console.log("[AuthContext] onAuthStateChanged triggered. User:", user ? user.uid : "null");
        setCurrentUser(user); // Update the user state

        if (user) {
          // Optional: Refresh token on initial load or significant state change
          // await refreshUserToken();
        }

        // Initial auth check is complete once the listener fires for the first time
        setLoading(false);
        console.log("[AuthContext] Initial auth check complete. Loading set to false.");
      },
      (error) => {
        // Handle errors during listener setup or operation
        console.error("[AuthContext] Error in onAuthStateChanged listener:", error);
        setCurrentUser(null);
        setLoading(false); // Ensure loading is false even on error
      }
    );

    // Cleanup: Unsubscribe from the listener when the component unmounts
    return () => {
      console.log("[AuthContext] Unsubscribing from onAuthStateChanged listener.");
      unsubscribe();
    };
  }, [refreshUserToken]); // Rerun effect if refreshUserToken changes (it shouldn't due to useCallback)

  // Value provided by the context
  const value = {
    currentUser,
    loading,
    refreshUserToken,
  };

  console.log(`[AuthContext-Provider] Rendering - Loading: ${loading}, User: ${!!currentUser}`);

  // Provide the context value to child components
  // Don't render children until the initial auth check is complete to avoid flashes
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Export function to get the current user directly (useful outside components, e.g., API routes)
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

// Export function needed by the old sign-in logic (can be removed if sign-in is updated)
export function setGlobalAuthUser(user: User | null) {
    console.warn("[AuthContext] setGlobalAuthUser is deprecated. Rely on AuthProvider state.");
    // This function no longer directly manipulates the provider's state.
    // The onAuthStateChanged listener is the source of truth.
    if (user && auth.currentUser?.uid !== user.uid) {
        console.warn("[AuthContext] setGlobalAuthUser called with a different user than auth.currentUser.");
        // Potentially trigger a token refresh or other check if needed, but avoid direct state setting.
    } else if (!user && auth.currentUser) {
         console.warn("[AuthContext] setGlobalAuthUser called with null but auth.currentUser exists.");
    }
}
