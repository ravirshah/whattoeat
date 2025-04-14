// src/lib/context/AuthContext.tsx
'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useRef // Import useRef
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
  const listenerAttached = useRef(false); // Prevent duplicate listeners

  // Function to manually refresh the ID token
  const refreshUserToken = useCallback(async (): Promise<string | null> => {
    // Add extra check for auth object readiness
    if (!auth) {
        console.warn("[AuthContext] refreshUserToken called before auth initialized.");
        return null;
    }
    const user = auth.currentUser;
    if (user) {
      try {
        console.log("[AuthContext] Forcing token refresh for user:", user.uid);
        const token = await user.getIdToken(true); // Force refresh
        console.log("[AuthContext] Token refreshed successfully.");
        return token;
      } catch (error: any) {
        console.error("[AuthContext] Error refreshing token:", error);
        // Sign out the user if token refresh fails significantly (e.g., user deleted, disabled)
        if (error.code === 'auth/user-token-expired' || error.code === 'auth/user-disabled' || error.code === 'auth/user-not-found') {
             console.warn("[AuthContext] Signing out due to token refresh error:", error.code);
             await auth.signOut();
             setCurrentUser(null); // Update state immediately
        }
        return null;
      }
    }
    console.log("[AuthContext] refreshUserToken called but no user was found.");
    return null;
  }, []);

  useEffect(() => {
    // Ensure listener is attached only once
    if (listenerAttached.current || !auth) return;
    listenerAttached.current = true;

    console.log("[AuthContext] Setting up onAuthStateChanged listener...");

    // Subscribe to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        // Auth state changed
        console.log("[AuthContext] >>> onAuthStateChanged CALLBACK START <<<");
        console.log("[AuthContext] Listener triggered. Received user:", user ? user.uid : "null");

        setCurrentUser(user); // Update the user state
        console.log("[AuthContext] currentUser state updated in context.");

        setLoading(false); // Set loading to false *after* setting user
        console.log("[AuthContext] loading state set to FALSE in context.");
        console.log("[AuthContext] >>> onAuthStateChanged CALLBACK END <<<");
      },
      (error) => {
        // Handle errors during listener setup or operation
        console.error("[AuthContext] XXX Error in onAuthStateChanged listener XXX:", error);
        setCurrentUser(null);
        setLoading(false); // Ensure loading is false even on error
        console.log("[AuthContext] Set loading to FALSE due to listener error.");
      }
    );

    console.log("[AuthContext] onAuthStateChanged listener setup complete.");

    // Cleanup: Unsubscribe from the listener when the component unmounts
    return () => {
      console.log("[AuthContext] Unsubscribing from onAuthStateChanged listener.");
      unsubscribe();
      listenerAttached.current = false;
    };
    // Intentionally keeping dependencies minimal for the listener setup itself.
    // refreshUserToken is stable due to useCallback.
  }, []); // Run only once on mount

  // Value provided by the context
  const value = {
    currentUser,
    loading,
    refreshUserToken,
  };

  // Logging provider state on re-render
  // console.log(`[AuthContext-Provider] Rendering - Loading: ${loading}, User: ${currentUser?.uid ?? 'null'}`);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Export function to get the current user directly (useful outside components, e.g., API routes)
export const getCurrentUser = (): User | null => {
  return auth?.currentUser ?? null; // Add check for auth existence
};

// Deprecated function - keep for reference or remove if sure it's unused
export function setGlobalAuthUser(user: User | null) {
    console.warn("[AuthContext] setGlobalAuthUser is deprecated. Rely on AuthProvider state.");
}
