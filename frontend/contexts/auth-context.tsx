"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  id?: number;
  email?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  avatar?: string;
} | null;

type AuthContextValue = {
  user: User;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  async function fetchMe() {
    setLoading(true);
    try {
      // If your auth flow uses cookies set by Next proxy, include credentials.
      const res = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "same-origin", // important for cookie-based sessions
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        setUser(null);
        setLoading(false);
        return;
      }

      const data = await res.json().catch(() => ({}));

      // Normalize data from backend to a consistent user shape
      const normalized = {
        id: data?.id ?? data?.user_id ?? data?.sub ?? undefined,
        email: data?.email ?? data?.username ?? undefined,
        first_name: data?.first_name ?? data?.fname ?? undefined,
        last_name: data?.last_name ?? data?.lname ?? undefined,
        avatar: data?.avatar ?? data?.profile_image ?? undefined,
      };

      normalized.name =
        data?.name ??
        (normalized.first_name && normalized.last_name
          ? `${normalized.first_name} ${normalized.last_name}`
          : normalized.first_name ?? normalized.email?.split("@")[0] ?? null);

      setUser(normalized);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh() {
    await fetchMe();
  }

  async function signOut() {
    try {
      // call Next proxy or backend logout if you have one
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } catch (e) {
      // ignore
    }
    // also remove any stored token if you used localStorage
    if (typeof window !== "undefined") {
      localStorage.removeItem("jwt_token");
    }
    setUser(null);
    router.push("/log-in");
  }

  return (
    <AuthContext.Provider value={{ user, loading, refresh, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}