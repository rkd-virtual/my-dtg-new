"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Site = {
  id: number;
  user_id?: number;
  site_slug?: string;
  label?: string | null;
  address?: string | null;
  is_default?: boolean;
  created_at?: string | null;
};

export default function SitesList() {
  const [sites, setSites] = useState<Site[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    fetch("/api/settings/sites")
      .then(async (res) => {
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || res.statusText);
        }
        return res.json();
      })
      .then((data: Site[]) => {
        if (!mounted) return;
        setSites(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Failed to fetch sites:", err);
        if (mounted) setError("Failed to load Amazon sites");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <div className="p-6">Loading sites...</div>;
  if (error) return <div className="p-6 text-destructive">{error}</div>;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold"></h3>
        <Button onClick={() => alert("Add site modal TODO")}>Add New Site</Button>
      </div>

      <div className="overflow-hidden rounded border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Site Code</TableHead>
              <TableHead>Label / Address</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {sites && sites.length > 0 ? (
              sites.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium font-mono">
                    {s.site_slug ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div>{s.label ?? "—"}</div>
                    {s.address && <div className="text-sm text-muted-foreground">{s.address}</div>}
                  </TableCell>
                  <TableCell>
                    {s.is_default ? <Badge variant="default">Default</Badge> : <span className="text-sm text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => alert(`Edit ${s.site_slug}`)}>Edit</Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => alert(`Delete ${s.site_slug}`)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                  No sites found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
