// frontend/app/portal/(app)/dashboard/page.tsx
"use client";

import { SiteHeader } from "@/components/site-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Item, ItemMedia, ItemContent, ItemTitle } from "@/components/ui/item";
import { Spinner } from "@/components/ui/spinner";

export default function Page() {
  const { sites, loading } = useAuth();

  // real state may be null until we decide a value
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [ordersCount, setOrdersCount] = useState<number | null>(null);
  const [quotesCount, setQuotesCount] = useState<number | null>(null);
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // decide initial selection once sites are available (or if a session value exists)
  useEffect(() => {
    // do nothing while auth/sites are still loading
    if (loading) return;

    // if already set (user navigated and state preserved), don't overwrite
    if (selectedAccount !== null) return;

    try {
      const saved = sessionStorage.getItem("selectedAccount");
      if (saved) {
        setSelectedAccount(saved);
        return;
      }
    } catch {
      // ignore
    }

    if (sites && sites.length > 0) {
      const def = sites.find((s) => s.is_default) || sites[0];
      if (def && def.site_slug) {
        setSelectedAccount(def.site_slug);
        return;
      }
    }

    // final fallback
    setSelectedAccount("all-accounts");
  }, [loading, sites, selectedAccount]);

  // persist selection whenever user changes it (but guard null)
  useEffect(() => {
    if (selectedAccount === null) return;
    try {
      sessionStorage.setItem("selectedAccount", selectedAccount);
    } catch {}
  }, [selectedAccount]);

  // derive the actual value to pass into <select>
  // this avoids timing mismatch if selectedAccount is null while sites load
  const selectValue = useMemo(() => {
    if (selectedAccount) return selectedAccount;
    // still undecided: if sites exist, prefer default/first for display, else fallback
    if (!loading && sites && sites.length > 0) {
      const def = sites.find((s) => s.is_default) || sites[0];
      return def?.site_slug ?? "all-accounts";
    }
    return "all-accounts";
  }, [selectedAccount, sites, loading]);

  // fetch counts when we have a concrete site to call (resolve siteToUse from selectedAccount or default)
  useEffect(() => {
    // resolve concrete site slug to use for API call
    let siteToUse: string | null = null;

    // prefer explicit user selection if set
    if (selectedAccount && selectedAccount !== "all-accounts") siteToUse = selectedAccount;
    else if (selectedAccount === "all-accounts") {
      // if user intentionally set to all-accounts but sites exist, use default site for counts
      if (sites && sites.length > 0) {
        const def = sites.find((s) => s.is_default) || sites[0];
        siteToUse = def?.site_slug ?? null;
      } else {
        siteToUse = null;
      }
    } else {
      // selectedAccount is null (undecided): derive from sites if available
      if (sites && sites.length > 0) {
        const def = sites.find((s) => s.is_default) || sites[0];
        siteToUse = def?.site_slug ?? null;
      } else {
        siteToUse = null;
      }
    }

    if (!siteToUse) {
      setOrdersCount(null);
      setQuotesCount(null);
      setFetchError(null);
      return;
    }

    let aborted = false;
    async function fetchCountsForSite(siteSlugRaw: string) {
      setLoadingCounts(true);
      setFetchError(null);

      try {
        const siteSlug = String(siteSlugRaw || "").trim();
        if (!siteSlug) throw new Error("Invalid site code");

        const normalized = siteSlug.toUpperCase();
        //const url = `https://dtg-backend.onrender.com/api/dashboard?site_code=${encodeURIComponent(normalized)}`;

        const url =  `${process.env.NEXT_PUBLIC_SITES_API}/dashboard?site_code=${encodeURIComponent(normalized)}`;
        const res = await fetch(url, {
          method: "GET",
          headers: { Accept: "application/json" },
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(txt || `Dashboard fetch failed (${res.status})`);
        }

        const json = await res.json().catch(() => ({}));
        if (aborted) return;

        const part1 = json?.part1 ?? {};
        const orderVal = typeof part1.order === "number" ? part1.order : part1.order ? Number(part1.order) : null;
        const quotesVal = typeof part1.quotes === "number" ? part1.quotes : part1.quotes ? Number(part1.quotes) : null;

        setOrdersCount(Number.isFinite(orderVal) ? orderVal : null);
        setQuotesCount(Number.isFinite(quotesVal) ? quotesVal : null);
      } catch (err: any) {
        if (aborted) return;
        console.error("Failed to fetch dashboard:", err);
        setFetchError(err?.message || "Failed to fetch dashboard");
        setOrdersCount(null);
        setQuotesCount(null);
      } finally {
        if (!aborted) setLoadingCounts(false);
      }
    }

    fetchCountsForSite(siteToUse);
    return () => {
      aborted = true;
    };
  }, [selectedAccount, sites, loading]);

  const showSelect = !!sites && sites.length > 1;

  return (
    <>
      <SiteHeader title="Dashboard" />
      <div className="p-4 lg:p-6">
        {/* Show spinner loader while pulling data */}
        {loadingCounts && (
          <div className="flex justify-start mb-6">
            <div className="w-full sm:w-[400px] md:w-[320px] lg:w-[300px]">
              <Item variant="muted">
                <ItemMedia>
                  <Spinner />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle className="line-clamp-1">Loading dashboard data…</ItemTitle>
                </ItemContent>
              </Item>
            </div>
          </div>
        )}
        {/* Select card - hidden when user has <= 1 site */}
        {showSelect && (
          <div className="mb-6 flex justify-start">
            <Card className="w-full sm:w-[400px] md:w-[320px] lg:w-[300px]">
              <CardContent className="p-4">
                <label htmlFor="account-select" className="text-sm font-semibold mb-2 block">
                  Select an Account
                </label>

                <select
                  id="account-select"
                  // use the derived value to avoid mismatch
                  value={selectValue}
                  onChange={(e) => {
                    // update real state (string)
                    setSelectedAccount(e.target.value);
                  }}
                  className="rounded-md border px-3 py-2 text-sm shadow-sm w-full"
                >
                  <option value="all-accounts">All Accounts</option>
                  {!loading && sites && sites.length > 0
                    ? sites.map((s) => (
                        <option key={s.id} value={s.site_slug}>
                          {s.label}
                        </option>
                      ))
                    : null}
                </select>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Orders</CardTitle>
              <CardDescription>Quick stats</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{loadingCounts ? "…" : ordersCount !== null ? ordersCount : "—"}</div>
              {fetchError && <div className="text-sm text-red-600 mt-2">{fetchError}</div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quotes</CardTitle>
              <CardDescription>Quick stats</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{loadingCounts ? "…" : quotesCount !== null ? quotesCount : "—"}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
