"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
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
  signInWithApple: (user: AuthUser) => void;
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

  const signInWithApple = (user: AuthUser) => {
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
      signInWithApple,
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
