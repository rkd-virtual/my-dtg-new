"use client";

import React, { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { LoaderIcon } from "lucide-react";
import { getApi, putApi } from "@/lib/apiClient";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";

type PersonalData = {
  first_name: string;
  last_name: string;
  email?: string;
  job_title?: string;
  other_accounts?: string[];
};

export default function PersonalInfoForm() {
  const [data, setData] = useState<PersonalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ first_name?: string; last_name?: string }>({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setServerError(null);

      try {
        const settings = await getApi("/settings");

        // prefer email from settings, fallback to auth/me
        let email = settings.email ?? "";
        if (!email) {
          try {
            const me = await getApi("/auth/me");
            email = me?.email ?? "";
          } catch {
            // ignore; leave email empty
          }
        }

        if (!cancelled) {
          setData({
            first_name: settings.first_name ?? "",
            last_name: settings.last_name ?? "",
            email,
            job_title: settings.job_title ?? "",
            other_accounts: Array.isArray(settings.other_accounts)
              ? settings.other_accounts
              : settings.other_accounts
              ? String(settings.other_accounts)
                  .split(",")
                  .map((s: string) => s.trim())
                  .filter(Boolean)
              : [],
          });
          setFieldErrors({});
        }
      } catch (err: any) {
        if (!cancelled) setServerError(err?.message ?? "Unable to load settings");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function updateField<K extends keyof PersonalData>(key: K, value: PersonalData[K]) {
    setData((d) => (d ? { ...d, [key]: value } : d));
    if (key === "first_name" || key === "last_name") {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        if (key === "first_name") delete copy.first_name;
        if (key === "last_name") delete copy.last_name;
        return copy;
      });
    }
    setServerError(null);
  }

  function validate(d: PersonalData) {
    const errors: Record<string, string> = {};
    if (!d.first_name || !d.first_name.trim()) errors.first_name = "First name is required";
    if (!d.last_name || !d.last_name.trim()) errors.last_name = "Last name is required";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSave(e?: React.FormEvent) {
    e?.preventDefault();
    if (!data) return;

    const ok = validate(data);
    if (!ok) return;

    setSaving(true);
    setServerError(null);

    const payload = {
      first_name: data.first_name,
      last_name: data.last_name,
      job_title: data.job_title ?? "",
      other_accounts: (data.other_accounts || []).map((s) => String(s).trim()).filter(Boolean),
    };

    try {
      await putApi("/settings", payload);
      // global toast (Sonner)
      toast.success("Personal information updated.", {
        icon: <AlertCircle className="w-5 h-5 text-green-500" />,
      });
    } catch (err: any) {
      const msg = err?.payload?.message || err?.message || "Failed to save settings";
      setServerError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  function otherAccountsToString(list?: string[]) {
    if (!list || list.length === 0) return "";
    return list.join(", ");
  }

  function parseOtherAccounts(str: string) {
    return str
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (loading) return <div className="p-4"><LoaderIcon className="h-5 w-5 animate-spin" /></div>;
  if (!data) return <div className="p-4 text-red-600">No personal data available.</div>;

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {serverError && <div className="text-sm text-red-600">{serverError}</div>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input id="firstName" value={data.first_name} onChange={(e) => updateField("first_name", e.target.value)} />
          {fieldErrors.first_name && <p className="mt-1 text-sm text-red-600">{fieldErrors.first_name}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input id="lastName" value={data.last_name} onChange={(e) => updateField("last_name", e.target.value)} />
          {fieldErrors.last_name && <p className="mt-1 text-sm text-red-600">{fieldErrors.last_name}</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={data.email ?? ""} readOnly disabled />
        </div>

        <div className="space-y-2">
          <Label htmlFor="other_accounts">Other Accounts</Label>
          <Input id="other_accounts" value={otherAccountsToString(data.other_accounts)} onChange={(e) => updateField("other_accounts", parseOtherAccounts(e.target.value) as any)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="job_title">Job Title</Label>
        <Input id="job_title" value={data.job_title ?? ""} onChange={(e) => updateField("job_title", e.target.value)} />
      </div>

      <Separator />

      <div className="flex items-center justify gap-2">
        {/* <Button type="button" onClick={() => { setServerError(null); setFieldErrors({}); }} disabled={saving}>
          Cancel
        </Button> */}

        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
