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
import { Spinner } from "@/components/ui/spinner";
import { Label } from "@/components/ui/label";
import { LoaderIcon, ChevronDown, ChevronDownIcon } from "lucide-react"; // Import the arrow icon

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

    if (selectedAccount && selectedAccount !== "all-accounts")
      siteToUse = selectedAccount;
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
    const base = "/portal/orders-quotes";
    const params = new URLSearchParams();
    params.set("tab", tab);
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  };

  return (
    <>
      <SiteHeader title="Dashboard" />
      <div className="p-4 lg:p-6">
        <Card className="w-fit shadow-sm p-0">
                <CardContent className="p-3 flex items-center gap-4"> 
                    {loading ? (
                        <div className="flex items-center gap-2">
                            <LoaderIcon className="h-4 w-4 animate-spin" />
                            <span>Loading accounts...</span>
                        </div>
                    ) : showSelect ? (
                        <div className="flex items-center gap-3"> 
                            <Label className="text-sm font-medium whitespace-nowrap text-gray-900 mb-0">
                                Select an Account
                            </Label>

                            <div className="relative flex items-center">
                                <select
                                    id="account-select"
                                    value={selectValue}
                                    onChange={(e) => setSelectedAccount(e.target.value)}
                                    className="
                                        block
                                        appearance-none
                                        rounded-md
                                        border
                                        border-gray-300
                                        bg-white
                                        pl-3
                                        pr-8
                                        py-1.5
                                        text-sm
                                        font-medium
                                        text-gray-900
                                        shadow-sm
                                        focus:border-indigo-500
                                        focus:outline-none
                                        focus:ring-1
                                        focus:ring-indigo-500
                                        cursor-pointer
                                    "
                                    style={{ minWidth: "140px" }}
                                >
                                    <option value="all-accounts">All Accounts</option>
                                    {!loading && sites && sites.length > 0
                                        ? sites.map((s: any) => (
                                            <option key={s.id} value={s.site_slug}>
                                                {s.label}
                                            </option>
                                        ))
                                        : null}
                                </select>
                                <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
                            </div>

                            {loadingCounts && (
                                <div className="flex items-center text-sm text-blue-600">
                                <LoaderIcon className="h-5 w-5 animate-spin" />
                                </div>
                            )}
                        </div>
                    ) : sites && sites.length === 1 ? (
                        <div className="flex items-center gap-4">
                            <div className="text-sm">
                                Account: <strong>{sites[0].label ?? sites[0].site_slug}</strong>
                            </div>
                            {loadingCounts && <LoaderIcon className="h-4 w-4 animate-spin" />}
                        </div>
                    ) : (
                        <div className="text-sm text-muted-foreground">No accounts available</div>
                    )}
                </CardContent>
            </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 mt-[20px]">
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