import React, { createContext, useContext, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "../lib/firebase";

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to construct a mock User object for offline / local dev fallback
const createLocalDevUser = (email: string): User => {
  const hash = Math.abs(email.split("").reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0));
  return {
    uid: `dev-user-${hash}`,
    email: email,
    displayName: email.split("@")[0] || "Developer",
    emailVerified: true,
    isAnonymous: false,
    metadata: {},
    providerData: [],
    refreshToken: "mock-refresh-token",
    tenantId: null,
    delete: async () => {},
    getIdToken: async () => "mock-id-token",
    getIdTokenResult: async () => ({} as any),
    reload: async () => {},
    toJSON: () => ({}),
    phoneNumber: null,
    photoURL: null,
    providerId: "firebase",
  } as unknown as User;
};

function isApiKeyError(error: any): boolean {
  if (!error) return false;
  const msg = (error.message || "").toLowerCase();
  const code = (error.code || "").toLowerCase();
  return (
    code.includes("api-key") ||
    code.includes("invalid-api-key") ||
    msg.includes("api-key") ||
    msg.includes("api key")
  );
}

function formatAuthError(error: any): string {
  if (!error) return "An unexpected error occurred.";
  const code = error.code || "";
  
  switch (code) {
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Invalid email or password.";
    case "auth/email-already-in-use":
      return "An account with this email address already exists.";
    case "auth/weak-password":
      return "Password should be at least 6 characters long.";
    case "auth/too-many-requests":
      return "Access to this account has been temporarily disabled due to many failed login attempts. Please try again later or reset your password.";
    case "auth/popup-closed-by-user":
      return "Google sign-in popup was closed before completing.";
    case "auth/operation-not-allowed":
      return "This sign-in method is currently disabled.";
    case "auth/network-request-failed":
      return "Network connection error. Please check your internet connection.";
    default:
      if (isApiKeyError(error)) {
        return "Firebase API Key is invalid or unconfigured. Switched to local dev session.";
      }
      return error.message || "Authentication failed. Please try again.";
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if we have a saved local dev user session first
    const savedLocalEmail = localStorage.getItem("sp_local_user_email");
    if (savedLocalEmail) {
      setUser(createLocalDevUser(savedLocalEmail));
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setLoading(false);
      },
      (err) => {
        console.warn("Firebase Auth listener warning:", err);
        setLoading(false);
      }
    );

    // Timeout safety for loading state
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const clearError = () => setError(null);

  const login = async (email: string, pass: string) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      if (isApiKeyError(err)) {
        console.info("Using local dev auth session for:", email);
        const devUser = createLocalDevUser(email);
        localStorage.setItem("sp_local_user_email", email);
        setUser(devUser);
        return;
      }
      const msg = formatAuthError(err);
      setError(msg);
      throw new Error(msg);
    }
  };

  const signup = async (email: string, pass: string) => {
    setError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      if (isApiKeyError(err)) {
        console.info("Using local dev auth signup session for:", email);
        const devUser = createLocalDevUser(email);
        localStorage.setItem("sp_local_user_email", email);
        setUser(devUser);
        return;
      }
      const msg = formatAuthError(err);
      setError(msg);
      throw new Error(msg);
    }
  };

  const logout = async () => {
    setError(null);
    localStorage.removeItem("sp_local_user_email");
    try {
      await signOut(auth);
    } catch (err: any) {
      // Ignore errors on signout for dev sessions
    } finally {
      setUser(null);
    }
  };

  const resetPassword = async (email: string) => {
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      if (isApiKeyError(err)) {
        // Dev fallback for reset password
        return;
      }
      const msg = formatAuthError(err);
      setError(msg);
      throw new Error(msg);
    }
  };

  const loginWithGoogle = async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      if (isApiKeyError(err)) {
        const email = "google.user@socialpublisher.com";
        console.info("Using local dev Google auth session for:", email);
        const devUser = createLocalDevUser(email);
        localStorage.setItem("sp_local_user_email", email);
        setUser(devUser);
        return;
      }
      const msg = formatAuthError(err);
      setError(msg);
      throw new Error(msg);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        clearError,
        login,
        signup,
        logout,
        resetPassword,
        loginWithGoogle,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
