"use client";

import Link from "next/link";
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

  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [ordersCount, setOrdersCount] = useState<number | null>(null);
  const [quotesCount, setQuotesCount] = useState<number | null>(null);
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // initial selection logic (sessionStorage -> default site -> all-accounts)
  useEffect(() => {
    if (loading) return;
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

    setSelectedAccount("all-accounts");
  }, [loading, sites, selectedAccount]);

  // persist selection
  useEffect(() => {
    if (selectedAccount === null) return;
    try {
      sessionStorage.setItem("selectedAccount", selectedAccount);
    } catch {}
  }, [selectedAccount]);

  const selectValue = useMemo(() => {
    if (selectedAccount) return selectedAccount;
    if (!loading && sites && sites.length > 0) {
      const def = sites.find((s) => s.is_default) || sites[0];
      return def?.site_slug ?? "all-accounts";
    }
    return "all-accounts";
  }, [selectedAccount, sites, loading]);

  // fetch counts for resolved site
  useEffect(() => {
    let siteToUse: string | null = null;

    if (selectedAccount && selectedAccount !== "all-accounts") siteToUse = selectedAccount;
    else if (selectedAccount === "all-accounts") {
      if (sites && sites.length > 0) {
        const def = sites.find((s) => s.is_default) || sites[0];
        siteToUse = def?.site_slug ?? null;
      } else {
        siteToUse = null;
      }
    } else {
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
        const url = `${process.env.NEXT_PUBLIC_SITES_API}/dashboard?site_code=${encodeURIComponent(
          normalized
        )}`;

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
        const orderVal =
          typeof part1.order === "number" ? part1.order : part1.order ? Number(part1.order) : null;
        const quotesVal =
          typeof part1.quotes === "number"
            ? part1.quotes
            : part1.quotes
            ? Number(part1.quotes)
            : null;

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

  // build link to Orders & Quotes page with `tab` param and optional site param (omitted for 'all-accounts')
  const buildOrdersLink = (tab: "orders" | "quotes") => {
    const base = "/portal/orders";
    const params = new URLSearchParams();
    params.set("tab", tab);
   /*  if (selectValue && selectValue !== "all-accounts") {
      params.set("site", selectValue);
    } */
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
    //return qs ? `${base}` : base;
  };

  return (
    <>
      <SiteHeader title="Dashboard" />
      <div className="p-4 lg:p-6">
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

        {showSelect && (
          <div className="mb-6 flex justify-start">
            <Card className="w-full sm:w-[400px] md:w-[320px] lg:w-[300px]">
              <CardContent className="p-4">
                <label htmlFor="account-select" className="text-sm font-semibold mb-2 block">
                  Select an Account
                </label>

                <select
                  id="account-select"
                  value={selectValue}
                  onChange={(e) => {
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
          {/* Orders card — clickable, navigates to Orders & Quotes with tab=orders */}
          <Link
            href={buildOrdersLink("orders")}
            className="block focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-300 rounded-md"
            aria-label="View Orders"
          >
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle>Orders</CardTitle>
                <CardDescription>Quick stats</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">
                  {loadingCounts ? "…" : ordersCount !== null ? ordersCount : "—"}
                </div>
                {fetchError && <div className="text-sm text-red-600 mt-2">{fetchError}</div>}
              </CardContent>
            </Card>
          </Link>

          {/* Quotes card — clickable, navigates to Orders & Quotes with tab=quotes */}
          <Link
            href={buildOrdersLink("quotes")}
            className="block focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-300 rounded-md"
            aria-label="View Quotes"
          >
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle>Quotes</CardTitle>
                <CardDescription>Quick stats</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">
                  {loadingCounts ? "…" : quotesCount !== null ? quotesCount : "—"}
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </>
  );
}
