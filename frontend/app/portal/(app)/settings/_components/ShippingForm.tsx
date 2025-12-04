// portal/(app)/settings/_components/ShippingForm.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getApi, putApi } from "@/lib/apiClient";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";

type Site = {
  id: number;
  site_slug?: string;
  label?: string | null;
  is_default?: boolean;
};

export default function ShippingForm() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [zipLoading, setZipLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedSite, setSelectedSite] = useState<string>("ALL");

  const [form, setForm] = useState({
    address1: "",
    address2: "",
    city: "",
    state: "",
    zip: "",
    country: "",
    shipto: "",
  });

  const [validation, setValidation] = useState({
    address1: "",
    city: "",
    state: "",
    zip: "",
    country: "",
  });

  // zipValid: null = unknown, true = valid, false = invalid
  const [zipValid, setZipValid] = useState<boolean | null>(null);

  // debounce ref for zip validation
  const zipTimerRef = useRef<number | null>(null);

  const ZIP_API_BASE = process.env.NEXT_PUBLIC_ZIP_API || "https://api.zippopotam.us";
  const SITES_API_BASE = process.env.NEXT_PUBLIC_SITES_API || "https://dtg-backend.onrender.com/api";

  // load sites + saved shipping on mount
  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const sitesPayload = await getApi("/auth/profile/sites");
        if (!mounted) return;
        const arr: Site[] = Array.isArray(sitesPayload) ? sitesPayload : [];
        setSites(arr);
        const def = arr.find((s) => s.is_default);
        setSelectedSite(def ? (def.site_slug ?? "ALL") : (arr[0]?.site_slug ?? "ALL"));
      } catch (e: any) {
        console.error("Failed to load sites", e);
        if (mounted) {
          setSites([]);
          setError("Failed to load accounts");
        }
      }

      try {
        const ship = await getApi("/settings/shipping");
        if (!mounted) return;
        setForm({
          address1: ship.address1 || "",
          address2: ship.address2 || "",
          city: ship.city || "",
          state: ship.state || "",
          zip: ship.zip || "",
          country: ship.country || "",
          shipto: ship.shipto || "",
        });
        // if we have a zip from server, run a quick validation state (non-blocking)
        if (ship?.zip) {
          // run validation but do not overwrite city/state if already provided by server
          validateZipDebounced(ship.zip, true);
        }
      } catch (e) {
        console.error("Failed to load shipping info", e);
        // ignore — user can fill manually
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
      if (zipTimerRef.current) window.clearTimeout(zipTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateField<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setValidation((v) => ({ ...v, [key]: "" }));
    setError(null);

    // if user types into zip, debounce validation
    if (key === "zip") {
      // reset previous validation state while typing
      setZipValid(null);
      if (zipTimerRef.current) window.clearTimeout(zipTimerRef.current);
      validateZipDebounced(value);
    }
  }

  // wrapper to debounce validateZip (exposed so we can call on mount or onBlur)
  function validateZipDebounced(zipValue: string, immediate = false) {
    if (zipTimerRef.current) {
      window.clearTimeout(zipTimerRef.current);
      zipTimerRef.current = null;
    }

    if (!zipValue || zipValue.trim().length === 0) {
      setZipValid(null);
      setValidation((v) => ({ ...v, zip: "" }));
      return;
    }

    // immediate call (e.g. when invoked on mount) or onBlur
    if (immediate) {
      validateZip(zipValue.trim());
      return;
    }

    // debounce - wait 700ms after user stops typing
    zipTimerRef.current = window.setTimeout(() => {
      validateZip(zipValue.trim());
      zipTimerRef.current = null;
    }, 700);
  }

  // actual ZIP validation using zippopotam.us or configured host
  async function validateZip(zip: string) {
    // basic quick checks
    if (!zip || zip.trim().length < 5) {
      setValidation((v) => ({ ...v, zip: "ZIP must be at least 5 characters" }));
      setZipValid(false);
      return;
    }

    const country = (form.country || "US").trim().toUpperCase() || "US";
    setZipLoading(true);
    setValidation((v) => ({ ...v, zip: "" }));
    try {
      const url = `${ZIP_API_BASE}/${encodeURIComponent(country)}/${encodeURIComponent(zip)}`;
      const res = await fetch(url, { method: "GET" });

      if (!res.ok) {
        setValidation((v) => ({ ...v, zip: "ZIP code not found" }));
        setZipValid(false);
        return;
      }

      const data = await res.json();
      const place = Array.isArray(data.places) && data.places[0] ? data.places[0] : null;
      if (!place) {
        setValidation((v) => ({ ...v, zip: "ZIP code not found" }));
        setZipValid(false);
        return;
      }

      // map remote response (defensive)
      const cityFromApi = (place["place name"] || place["place_name"] || "").trim();
      const stateFromApi = (place["state abbreviation"] || place["state"] || "").trim();

      // Update form but preserve existing city / state if user already has values
      setForm((f) => ({
        ...f,
        city: f.city && f.city.trim() ? f.city : (cityFromApi || f.city),
        state: f.state && f.state.trim() ? f.state : (stateFromApi || f.state),
        country: f.country && f.country.trim() ? f.country : country,
      }));

      setValidation((v) => ({ ...v, zip: "" }));
      setZipValid(true);
    } catch (err: any) {
      console.error("ZIP lookup failed", err);
      setValidation((v) => ({ ...v, zip: "Failed to validate ZIP" }));
      setZipValid(false);
    } finally {
      setZipLoading(false);
    }
  }

  // when user selects a site, call third-party POST to fetch address
  async function handleSiteChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const slug = e.target.value;
    setSelectedSite(slug);
    setError(null);

    // if user chose "ALL", do nothing (no remote fetch)
    if (!slug || slug === "ALL") return;

    const selected = sites.find((s) => (s.site_slug ?? "") === slug);
    const accountName = selected?.label ?? selected?.site_slug ?? slug;

    setRemoteLoading(true);
    try {
      let first_name = "";
      let last_name = "";
      try {
        const me = await getApi("/auth/me");
        first_name = me.first_name || "";
        last_name = me.last_name || "";
      } catch (err) {
        console.warn("could not load /auth/me", err);
      }

      const body = {
        account_name: accountName,
        first_name,
        last_name,
      };

      const res = await fetch(`${SITES_API_BASE.replace(/\/$/, "")}/fetch-address`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Remote fetch failed (${res.status})`);
      }

      const data = await res.json();
      setForm((f) => ({
        ...f,
        address1: data.address1 ?? data.addr1 ?? f.address1,
        address2: data.address2 ?? f.address2,
        city: data.city ?? f.city,
        state: data.state ?? f.state,
        zip: data.zip ?? f.zip,
        country: data.country ?? f.country,
        shipto: data.shipto ?? f.shipto,
      }));

      // If we got a zip back, validate it (debounced immediate)
      if (data.zip) {
        validateZipDebounced(data.zip, true);
      }

      //toast.success?.("Address pre-filled from remote");
    } catch (err: any) {
      console.error("Remote fetch failed", err);
      toast.error?.(err?.message || "Failed to fetch address for selected site", {
        icon: <AlertCircle className="w-5 h-5 text-red-500" />,
      });
      setError("Failed to pre-fill address");
    } finally {
      setRemoteLoading(false);
    }
  }

  function validate() {
    const v = { address1: "", city: "", zip: "", country: "", state: "" };
    if (!form.address1.trim()) v.address1 = "Address is required";
    if (!form.city.trim()) v.city = "City is required";
    if (!form.state.trim()) v.state = "State is required";
    // if (!form.zip.trim()) v.zip = "ZIP / Postal code is required";

    if (!form.zip.trim()) {
    v.zip = "ZIP / Postal code is required";
    } else if (form.zip.trim().length < 5) {
      v.zip = "ZIP must be at least 5 characters";
    }

    if (!form.country.trim()) v.country = "Country is required";
    setValidation(v);
    return !v.address1 && !v.city && !v.zip && !v.country && !v.state;
  }

  async function handleSave(e?: React.FormEvent) {
    e?.preventDefault();
    if (!validate()) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = { ...form };
      await putApi("/settings/shipping", payload);
      toast.success?.("Shipping information saved", {
        icon: <AlertCircle className="w-5 h-5 text-green-500" />,
      });
    } catch (err: any) {
      console.error("Save failed", err);
      toast.error?.(err?.message || "Failed to save shipping info");
      setError(err?.message || "Failed to save shipping info");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    (async () => {
      setLoading(true);
      try {
        const ship = await getApi("/settings/shipping");
        setForm({
          address1: ship.address1 || "",
          address2: ship.address2 || "",
          city: ship.city || "",
          state: ship.state || "",
          zip: ship.zip || "",
          country: ship.country || "",
          shipto: ship.shipto || "",
        });
        setError(null);
        setValidation({ state: "", address1: "", city: "", zip: "", country: "" });
        setZipValid(null);
      } catch (e) {
        console.error("reload failed", e);
        setError("Failed to reload");
      } finally {
        setLoading(false);
      }
    })();
  }

  if (loading) return <div className="p-4">Loading shipping information…</div>;

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="siteAccount" className="mb-2">Select an Account</Label>
          <select
            id="siteAccount"
            className="w-full rounded border px-3 py-2 text-sm"
            value={selectedSite}
            onChange={handleSiteChange}
            disabled={remoteLoading}
          >
            <option value="ALL">All Accounts</option>
            {sites.map((s) => (
              <option key={s.id} value={s.site_slug ?? ""}>
                {s.label ?? s.site_slug}
              </option>
            ))}
          </select>
          {remoteLoading && <div className="text-sm text-muted-foreground mt-1">Fetching address…</div>}
        </div>

        <div>
          <Label htmlFor="shipto" className="mb-2">Ship To</Label>
          <Input id="shipto" value={form.shipto} onChange={(e) => updateField("shipto", e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="addr1" className="mb-2">Address Line 1</Label>
          <Input id="addr1" value={form.address1} onChange={(e) => updateField("address1", e.target.value)} />
          {validation.address1 && <p className="text-sm text-red-600">{validation.address1}</p>}
        </div>

        <div>
          <Label htmlFor="city" className="mb-2">City</Label>
          <Input id="city" value={form.city} onChange={(e) => updateField("city", e.target.value)} />
          {validation.city && <p className="text-sm text-red-600">{validation.city}</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="state" className="mb-2">State / Province</Label>
          <Input id="state" value={form.state} onChange={(e) => updateField("state", e.target.value)} />
          {validation.state && <p className="text-sm text-red-600">{validation.state}</p>}
        </div>

        <div>
          <Label htmlFor="country" className="mb-2">Country</Label>
          <Input id="country" value={form.country} onChange={(e) => updateField("country", e.target.value)} />
          {validation.country && <p className="text-sm text-red-600">{validation.country}</p>}
        </div>
      </div>

      {/* ZIP block with spinner + success/error icons and debounce */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="relative">
          <Label htmlFor="zip" className="mb-2 block">ZIP / Postal code</Label>

          <Input
            id="zip"
            className="pr-12" // give space for icons
            value={form.zip}
            onChange={(e) => updateField("zip", e.target.value)}
            onBlur={() => validateZipDebounced(form.zip, true)}
          />

          {/* positioned icon area: spinner / success / error */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
            {zipLoading ? (
              // spinner (simple SVG + tailwind animate-spin)
              <svg className="w-4 h-4 animate-spin text-muted-foreground" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
            ) : zipValid === true ? (
              // check icon
              <svg className="w-4 h-4 text-green-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : zipValid === false ? (
              // x icon
              <svg className="w-4 h-4 text-rose-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path fillRule="evenodd" d="M10 8.586L4.707 3.293a1 1 0 10-1.414 1.414L8.586 10l-5.293 5.293a1 1 0 001.414 1.414L10 11.414l5.293 5.293a1 1 0 001.414-1.414L11.414 10l5.293-5.293a1 1 0 00-1.414-1.414L10 8.586z" clipRule="evenodd" />
              </svg>
            ) : null}
          </div>

          {validation.zip && <p className="text-sm text-red-600 mt-1">{validation.zip}</p>}
        </div>
      </div>

      <Separator />

      <div className="flex items-center justify gap-2">
        {/* <Button type="button" variant="ghost" onClick={handleCancel} disabled={saving || remoteLoading}>
          Cancel
        </Button> */}
        <Button type="submit" disabled={saving || remoteLoading || zipLoading}>
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
