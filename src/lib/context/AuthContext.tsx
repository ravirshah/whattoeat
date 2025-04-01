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
    console.log("[AuthContext] useEffect triggered.");

    // Verify auth object exists - critical for listener setup
    if (!auth) {
      console.error("[AuthContext] Firebase auth object is NOT available! Cannot set up listener. Forcing loading=false.");
      setLoading(false); // Stop loading if Firebase auth didn't initialize
      return; // Exit effect early
    }

    console.log("[AuthContext] Setting up auth state listener...");
    // Ensure loading is true whenever we attempt to set up the listener
    // This prevents potential brief false states if the effect re-runs quickly
    setLoading(true);

    let isMounted = true; // Flag to prevent state updates after unmount
    let unsubscribe: (() => void) | undefined;

    // Safety timeout remains crucial
    const safetyTimeout = setTimeout(() => {
      if (isMounted && loading) { // Check mount status and if still loading
        console.warn("[AuthContext] Auth state determination timed out after 10s. Forcing loading state to false.");
        if (isMounted) setLoading(false); // Force loading to false if timeout is reached
      }
    }, 10000); // 10 seconds

    // Define the listener callback
    const handleAuthStateChange = (user: User | null) => {
      clearTimeout(safetyTimeout); // Clear the timeout because we got a response
      if (!isMounted) { 
        console.log("[AuthContext] onAuthStateChanged callback fired AFTER unmount. Ignoring.");
        return; 
      }
      console.log("[AuthContext] onAuthStateChanged callback fired.", user ? `User: ${user.uid}` : "No user");
      setCurrentUser(user);
      setLoading(false); // Successfully determined auth state
    };

    // Define the error callback for the listener itself
    const handleAuthError = (error: Error) => {
      clearTimeout(safetyTimeout);
      if (!isMounted) { 
        console.log("[AuthContext] onAuthStateChanged error callback fired AFTER unmount. Ignoring.");
        return; 
      }
      console.error("[AuthContext] onAuthStateChanged error callback fired:", error);
      setCurrentUser(null); // Assume no user on error
      setLoading(false); // Stop loading on error
    };

    try {
      // Attach the listener
      unsubscribe = onAuthStateChanged(auth, handleAuthStateChange, handleAuthError);
      console.log("[AuthContext] Listener attached successfully.");
    } catch (error) {
      // Catch synchronous errors during listener attachment
      clearTimeout(safetyTimeout);
      console.error("[AuthContext] Error synchronously attaching auth listener:", error);
      if (isMounted) {
        setCurrentUser(null);
        setLoading(false); // Stop loading if attachment failed
      }
    }

    // Cleanup function
    return () => {
      isMounted = false; // Set flag on unmount
      console.log("[AuthContext] Cleanup: Clearing timeout and unsubscribing listener.");
      clearTimeout(safetyTimeout);
      if (unsubscribe) {
        unsubscribe();
      } else {
        console.warn("[AuthContext] Cleanup: Unsubscribe function was not defined (listener might not have attached).");
      }
    };
    // Dependency array remains [auth] - ensures effect reruns if the auth object instance changes.
  }, [auth]);

  const value = {
    currentUser,
    loading,
  };

  // console.log("[AuthContext] Providing value:", { loading, hasUser: !!currentUser }); // Optional: Log provided value

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};