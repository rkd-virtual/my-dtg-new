// app/portal/(app)/dashboard/page.tsx
"use client";

import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CheckCircleIcon, LoaderIcon, EditIcon, DownloadIcon, MoreVerticalIcon } from "lucide-react";
import { useState } from "react";

interface LineItem {
  partNumber: string;
  name: string;
  quantity: number;
  price: string;
}

interface ActivityItem {
  id: string;
  type: "order" | "quote";
  date: string;
  status: string;
  items: LineItem[];
  total: number;
  account?: string;
}

function StatusBadge({ status }: { status: string }) {
  const isDone = status === "Delivered" || status === "Approved" || status === "Shipped";
  const isInProcess = status === "Processing" || status === "Pending";

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border bg-background">
      {isDone && <CheckCircleIcon className="h-4 w-4 text-green-600" />}
      {isInProcess && <LoaderIcon className="h-4 w-4 text-muted-foreground" />}
      <span className={isDone ? "text-green-600" : "text-muted-foreground"}>{status}</span>
    </div>
  );
}

/* This was for demo item list */
const allItems: ActivityItem[] = [];

export default function Page() {
  const [filter, setFilter] = useState<string>("all");
  const [selectedAccount, setSelectedAccount] = useState<string>("all-accounts");

  const filteredItems = allItems.filter((item) => {
    const typeMatch = filter === "all" ? true : item.type === filter;
    const accountMatch = selectedAccount === "all-accounts" ? true : item.account === selectedAccount;
    return typeMatch && accountMatch;
  });

  return (
    <>
      <SiteHeader title="Dashboard" />
      <div className="p-4 lg:p-6">
        {/* Row 1: Select card (compact width) */}
        <div className="mb-6 flex justify-start">
          <Card className="w-full sm:w-[400px] md:w-[320px] lg:w-[300px]">
            <CardContent className="p-4">
              <label htmlFor="account-select" className="text-sm font-semibold mb-2 block">
                Select an Account
              </label>
              <select
                id="account-select"
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="rounded-md border px-3 py-2 text-sm shadow-sm w-full"
              >
                <option value="all-accounts">All Accounts</option>
                <option value="amazon-ctz">Amazon CTZ</option>
                <option value="amazon-ryt">Amazon RYT</option>
                <option value="dev-account">DEV Account</option>
              </select>
            </CardContent>
          </Card>
        </div>

        {/* Row 2: Orders / Quotes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Orders</CardTitle>
              <CardDescription>Quick stats</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">47</div>
              {/* <div className="text-sm text-muted-foreground mt-1">5 new orders this month</div> */}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quotes</CardTitle>
              <CardDescription>Quick stats</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">12</div>
              {/* <div className="text-sm text-muted-foreground mt-1">2 new quotes this month</div> */}
            </CardContent>
          </Card>
        </div>

        {/* Row 3: Recent Activity table */}
        {/* <div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <div>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Your recent orders and quotes</CardDescription>
                </div>

                <div className="flex items-center gap-4">
                  

                  <ToggleGroup
                    type="single"
                    value={filter}
                    onValueChange={(value) => setFilter(value || "all")}
                    className="justify-start"
                  >
                    <ToggleGroupItem value="all" aria-label="Show all">All</ToggleGroupItem>
                    <ToggleGroupItem value="order" aria-label="Show orders">Orders</ToggleGroupItem>
                    <ToggleGroupItem value="quote" aria-label="Show quotes">Quotes</ToggleGroupItem>
                  </ToggleGroup>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Order ID</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead className="w-[80px] text-center">Qty.</TableHead>
                    <TableHead className="w-[120px] text-right">Total</TableHead>
                    <TableHead className="w-[160px]">Status</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => {
                    const totalQty = item.items.reduce((sum, lineItem) => sum + lineItem.quantity, 0);
                    const itemsSummary = item.items.length === 1 ? item.items[0].name : `${item.items[0].name} + ${item.items.length - 1} more`;

                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium font-mono text-sm">{item.id}</TableCell>
                        <TableCell className="max-w-[300px] truncate">{itemsSummary}</TableCell>
                        <TableCell className="text-center">{totalQty}</TableCell>
                        <TableCell className="text-right font-semibold">${item.total.toFixed(2)}</TableCell>
                        <TableCell><StatusBadge status={item.status} /></TableCell>
                        <TableCell>
                          {item.type === "quote" && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVerticalIcon className="h-4 w-4" />
                                  <span className="sr-only">Open menu</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem><EditIcon className="h-4 w-4 mr-2" />Edit Quote</DropdownMenuItem>
                                <DropdownMenuItem><DownloadIcon className="h-4 w-4 mr-2" />Download PDF</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div> */}
      </div>
    </>
  );
}
