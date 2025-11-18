// frontend/contexts/auth-context.tsx
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getApi, postApi } from "@/lib/apiClient";
import { Item, ItemMedia, ItemContent, ItemTitle } from "@/components/ui/item";
import { Spinner } from "@/components/ui/spinner";

type UserShape = {
  id?: number;
  email?: string;
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  job_title?: string | null;
  avatar?: string | null;
} | null;

export type SiteRow = {
  id: number;
  user_id: number;
  site_slug: string;
  label: string;
  is_default: boolean;
  created_at?: string | null;
};

type AuthContextType = {
  user: UserShape;
  sites: SiteRow[] | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (u: UserShape) => void;
  setSites: (s: SiteRow[] | null) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserShape>(null);
  const [sites, setSites] = useState<SiteRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  async function fetchMe() {
    try {
      const data: any = await getApi("/auth/me");
      if (!data) {
        setUser(null);
        return;
      }

      const normalized = {
        id: data?.id ?? undefined,
        email: data?.email ?? undefined,
        first_name: data?.first_name ?? null,
        last_name: data?.last_name ?? null,
        name:
          data?.name ??
          (data?.first_name ? `${data.first_name}${data?.last_name ? " " + data.last_name : ""}` : data?.email?.split("@")[0]) ??
          null,
        job_title: data?.job_title ?? null,
        avatar: data?.avatar ?? data?.profile_image ?? null,
      };

      setUser(normalized);
    } catch (err) {
      setUser(null);
    }
  }

  async function fetchSites() {
    try {
      const rows: any = await getApi("/auth/profile/sites");
      setSites(Array.isArray(rows) ? rows : null);
    } catch (err) {
      setSites(null);
    }
  }

  // refresh both user and sites
  async function refresh() {
    setLoading(true);
    try {
      await Promise.all([fetchMe(), fetchSites()]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // initial load
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signOut() {
    try {
      await postApi("/auth/session/logout");
    } catch {
      // ignore network error — still clear locally
    } finally {
      // clear UI state and redirect to login
      setUser(null);
      setSites(null);
      try {
        sessionStorage.removeItem("pendingEmail");
        sessionStorage.removeItem("selectedAccount");
      } catch {}
      router.push("/log-in");
    }
  }

  // --- themed loader while auth initializes ---
  if (loading) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/10 p-6">
      <div className="flex flex-col items-center gap-4">

        <div className="relative w-32 h-32 flex items-center justify-center">

          {/* outer spinner ring */}
          <Spinner
            size={120}
            className="text-muted-foreground/20 absolute inset-0 m-auto"
          />

          {/* make logo perfectly centered with a small visual offset */}
          <img
            src="/DTG_Logo copy.svg"
            alt="DTG"
            className="relative z-10 w-20 h-20 object-contain animate-pulse"
            style={{
              transform: "translateX(2px) translateY(4px)" 
            }}
          />
        </div>

        <div className="text-center">
          <div className="text-lg font-medium">Loading…</div>
          <div className="text-sm text-muted-foreground">Preparing your account</div>
        </div>

      </div>
    </div>
  );
}


  return (
    <AuthContext.Provider value={{ user, sites, loading, refresh, signOut, setUser, setSites }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside an AuthProvider");
  return ctx;
}
