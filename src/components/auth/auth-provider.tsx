"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { initFirebase, getFirebaseAuth, signInWithGoogleProvider, onAuthChanged } from "@/lib/firebase";
import type { User } from "firebase/auth";
import type { ReactNode } from "react";

interface AuthUser {
  name?: string;
  email: string;
}

interface AuthSession {
  user: AuthUser;
  signedInAt: string;
}

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  session: AuthSession | null;
  status: AuthStatus;
  signInWithGoogle: (user: AuthUser) => void;
  signOut: () => void;
}

const AUTH_STORAGE_KEY = "aacrm-auth-session";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    if (typeof window === "undefined") return;

    // initialize firebase if env present
    if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      try {
        initFirebase({
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
          messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
          appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
        });
      } catch (_error) {
        console.debug("init firebase error", _error);
      }
    }

    const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as AuthSession;
        setSession(parsed);
        setStatus("authenticated");
        return;
      } catch (error) {
        console.warn("Failed to parse stored auth session", error);
      }
    }

    // If Firebase auth is initialized, subscribe to it
    const auth = getFirebaseAuth();
    if (auth) {
      const unsubscribe = onAuthChanged((user: User | null) => {
        if (user) {
          const nextSession: AuthSession = {
            user: { email: user.email ?? "", name: user.displayName ?? undefined },
            signedInAt: new Date().toISOString(),
          };
          setSession(nextSession);
          setStatus("authenticated");
        } else {
          setSession(null);
          setStatus("unauthenticated");
        }
      });

      return () => unsubscribe();
    }

    setStatus("unauthenticated");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || status === "loading") {
      return;
    }

    if (session) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [session, status]);

  const signInWithGoogle = (user: AuthUser) => {
    // If Firebase is available, use Google provider via Firebase
    const auth = getFirebaseAuth();
    if (auth) {
      void (async () => {
        try {
          const user = await signInWithGoogleProvider();
          const nextSession: AuthSession = {
            user: { email: user.email ?? "", name: user.displayName ?? undefined },
            signedInAt: new Date().toISOString(),
          };
          setSession(nextSession);
          setStatus("authenticated");
        } catch (error) {
          console.warn("Firebase Google sign-in failed", error);
          throw error;
        }
      })();
      return;
    }

    const trimmedEmail = user.email.trim();
    if (!trimmedEmail) {
      throw new Error("Email is required to sign in.");
    }

    const nextSession: AuthSession = {
      user: {
        email: trimmedEmail,
        name: user.name?.trim() || undefined,
      },
      signedInAt: new Date().toISOString(),
    };

    setSession(nextSession);
    setStatus("authenticated");
  };

  const signOut = () => {
    setSession(null);
    setStatus("unauthenticated");
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      status,
  signInWithGoogle,
      signOut,
    }),
    [session, status]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
