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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CheckCircleIcon,
  LoaderIcon,
  EditIcon,
  DownloadIcon,
  MoreVerticalIcon,
  MinusIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import React from "react";

// Orders and Quotes page with edit and PDF download functionality
interface LineItem {
  partNumber: string;
  name: string;
  quantity: number;
  price: string;
  tracking?: string;
}

interface OrderOrQuote {
  id: string;
  type: "order" | "quote";
  date: string;
  status: string;
  items: LineItem[];
  total: number;
  tracking?: string;
}

const ordersAndQuotes: OrderOrQuote[] = [
  {
    id: "ORD-001",
    type: "order",
    date: "2024-10-10",
    status: "Delivered",
    items: [
      { partNumber: "EZGO-TXT-48V-CHARGER", name: "48V Battery Charger for EZGO TXT", quantity: 1, price: "149.99", tracking: "1Z999AA10123456784" },
      { partNumber: "CLUB-CAR-PRECEDENT-MOTOR", name: "Replacement Motor for Club Car Precedent", quantity: 1, price: "299.99", tracking: "1Z999AA10123456785" },
      { partNumber: "YAMAHA-DRIVE-CONTROLLER", name: "Speed Controller for Yamaha Drive", quantity: 1, price: "199.99", tracking: "1Z999AA10123456786" },
    ],
    total: 649.97,
    tracking: "1Z999AA10123456784",
  },
  {
    id: "QTE-001",
    type: "quote",
    date: "2024-10-12",
    status: "Pending",
    items: [
      { partNumber: "EZGO-RXV-BATTERY-SET", name: "6-Pack 8V Batteries for EZGO RXV", quantity: 1, price: "899.99" },
      { partNumber: "CLUB-CAR-DS-STEERING-WHEEL", name: "Steering Wheel Assembly for Club Car DS", quantity: 2, price: "79.99" },
    ],
    total: 1059.97,
  },
  {
    id: "ORD-002",
    type: "order",
    date: "2024-10-13",
    status: "Shipped",
    items: [
      { partNumber: "YAMAHA-G29-BRAKE-PADS", name: "Front Brake Pads for Yamaha G29", quantity: 2, price: "34.99", tracking: "1Z999AA10123456790" },
      { partNumber: "EZGO-TXT-WINDSHIELD", name: "Folding Windshield for EZGO TXT", quantity: 1, price: "149.99", tracking: "1Z999AA10123456791" },
    ],
    total: 219.97,
    tracking: "1Z999AA10123456790",
  },
  {
    id: "ORD-003",
    type: "order",
    date: "2024-09-28",
    status: "Processing",
    items: [
      { partNumber: "CLUB-CAR-PRECEDENT-SEAT", name: "Replacement Seat for Club Car Precedent", quantity: 4, price: "129.99" },
      { partNumber: "YAMAHA-DRIVE-HEADLIGHT", name: "LED Headlight Kit for Yamaha Drive", quantity: 1, price: "89.99" },
    ],
    total: 609.95,
    tracking: "Pending",
  },
  {
    id: "QTE-002",
    type: "quote",
    date: "2024-09-15",
    status: "Approved",
    items: [
      { partNumber: "EZGO-TXT-48V-CHARGER", name: "48V Battery Charger for EZGO TXT", quantity: 3, price: "149.99" },
      { partNumber: "CLUB-CAR-PRECEDENT-MOTOR", name: "Replacement Motor for Club Car Precedent", quantity: 2, price: "299.99" },
      { partNumber: "YAMAHA-DRIVE-CONTROLLER", name: "Speed Controller for Yamaha Drive", quantity: 2, price: "199.99" },
    ],
    total: 1649.92,
  },
];

function StatusBadge({ status }: { status: string }) {
  const isDone = status === "Delivered" || status === "Approved" || status === "Shipped";
  const isInProcess = status === "Processing" || status === "Pending";

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border bg-background">
      {isDone && <CheckCircleIcon className="h-4 w-4 text-green-600" />}
      {isInProcess && <LoaderIcon className="h-4 w-4 text-muted-foreground" />}
      <span className={isDone ? "text-green-600" : "text-muted-foreground"}>
        {status}
      </span>
    </div>
  );
}

export default function OrdersPage() {
  // filter is now only 'order' | 'quote'
  const [filter, setFilter] = useState<"order" | "quote">("order");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editingQuote, setEditingQuote] = useState<OrderOrQuote | null>(null);
  const [editedItems, setEditedItems] = useState<LineItem[]>([]);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  // initialize filter from ?tab=orders|quotes (orders -> 'order', quotes -> 'quote')
  useEffect(() => {
    const tab = searchParams?.get("tab") ?? "";
    if (tab === "quotes") setFilter("quote");
    else setFilter("order"); // default to orders for any other value (including 'orders' or missing)
  }, [searchParams]);

  // helper to update query param (keeps existing 'site' if present)
  const updateTabParam = (tab: "orders" | "quotes") => {
    const params = new URLSearchParams(Array.from(searchParams?.entries() || []));
    params.set("tab", tab);
    const qs = params.toString();
    router.push(`/portal/orders${qs ? `?${qs}` : ""}`);
  };

  const filteredData = useMemo(() => {
    return ordersAndQuotes.filter((item) => (filter === "order" ? item.type === "order" : item.type === "quote"));
  }, [filter]);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const handleEditQuote = (quote: OrderOrQuote) => {
    setEditingQuote(quote);
    setEditedItems([...quote.items]);
    setShowEditDialog(true);
  };

  const handleUpdateQuantity = (partNumber: string, newQuantity: number) => {
    setEditedItems((items) =>
      items.map((item) => (item.partNumber === partNumber ? { ...item, quantity: Math.max(1, newQuantity) } : item))
    );
  };

  const handleRemoveItem = (partNumber: string) => {
    setEditedItems((items) => items.filter((item) => item.partNumber !== partNumber));
  };

  const handleSaveQuote = () => {
    // In a real app, this would save to backend
    console.log("Saving quote:", editingQuote?.id, editedItems);
    setShowEditDialog(false);
    setEditingQuote(null);
  };

  const handleCancelEdit = () => {
    setShowEditDialog(false);
    setEditingQuote(null);
    setEditedItems([]);
  };

  const calculateEditedTotal = () => {
    return editedItems.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);
  };

  const handleDownloadPDF = (quote: OrderOrQuote) => {
    const pdfContent = generateQuotePDF(quote);
    const blob = new Blob([pdfContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quote-${quote.id}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateQuotePDF = (quote: OrderOrQuote) => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Quote ${quote.id}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 40px;
      color: #333;
    }
    .header {
      border-bottom: 3px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0;
      font-size: 32px;
      color: #1e40af;
    }
    .quote-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
      padding: 20px;
      background: #f8fafc;
      border-radius: 8px;
    }
    .info-block {
      flex: 1;
    }
    .info-label {
      font-size: 12px;
      text-transform: uppercase;
      color: #64748b;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .info-value {
      font-size: 18px;
      font-weight: 600;
      color: #1e293b;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    th {
      background: #f1f5f9;
      padding: 12px;
      text-align: left;
      font-size: 12px;
      text-transform: uppercase;
      font-weight: 600;
      color: #475569;
      border-bottom: 2px solid #cbd5e1;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    .part-number {
      font-family: 'Courier New', monospace;
      font-size: 13px;
      color: #64748b;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .total-section {
      margin-top: 30px;
      padding: 20px;
      background: #f8fafc;
      border-radius: 8px;
      text-align: right;
    }
    .total-row {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      margin-bottom: 10px;
    }
    .total-label {
      font-size: 14px;
      color: #64748b;
      margin-right: 20px;
    }
    .total-value {
      font-size: 24px;
      font-weight: 700;
      color: #1e40af;
      min-width: 150px;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      color: #64748b;
      font-size: 12px;
    }
    @media print {
      body {
        margin: 0;
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Quote Request</h1>
    <p style="margin: 10px 0 0 0; color: #64748b;">DTG Portal</p>
  </div>

  <div class="quote-info">
    <div class="info-block">
      <div class="info-label">Quote ID</div>
      <div class="info-value">${quote.id}</div>
    </div>
    <div class="info-block">
      <div class="info-label">Status</div>
      <div class="info-value">${quote.status}</div>
    </div>
    <div class="info-block">
      <div class="info-label">Date</div>
      <div class="info-value">${new Date(quote.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 20%;">Part Number</th>
        <th style="width: 45%;">Description</th>
        <th style="width: 10%;" class="text-center">Qty</th>
        <th style="width: 12%;" class="text-right">Unit Price</th>
        <th style="width: 13%;" class="text-right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${quote.items.map(item => `
        <tr>
          <td class="part-number">${item.partNumber}</td>
          <td>${item.name}</td>
          <td class="text-center">${item.quantity}</td>
          <td class="text-right">$${parseFloat(item.price).toFixed(2)}</td>
          <td class="text-right">$${(parseFloat(item.price) * item.quantity).toFixed(2)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="total-section">
    <div class="total-row">
      <div class="total-label">Total Amount</div>
      <div class="total-value">$${quote.total.toFixed(2)}</div>
    </div>
  </div>

  <div class="footer">
    <p>This quote is valid for 30 days from the date of issue.</p>
    <p>Thank you for your business!</p>
  </div>
</body>
</html>
    `.trim();
  };

  return (
    <>
      <SiteHeader title="Orders & Quotes" />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Orders & Quotes</h1>
            <p className="text-muted-foreground">View and track your orders and quote requests</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Removed "All" button per request */}
          <Button variant={filter === "order" ? "default" : "outline"} onClick={() => updateTabParam("orders")}>
            Orders
          </Button>
          <Button variant={filter === "quote" ? "default" : "outline"} onClick={() => updateTabParam("quotes")}>
            Quotes
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>History</CardTitle>
            <CardDescription>Your recent orders and quote requests</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead className="w-[120px]">Order ID</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="w-[80px] text-center">Qty.</TableHead>
                  <TableHead className="w-[120px] text-right">Total</TableHead>
                  <TableHead className="w-[160px]">Status</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item) => {
                  const isExpanded = expandedRows.has(item.id);
                  const totalQty = item.items.reduce((sum, lineItem) => sum + lineItem.quantity, 0);
                  const itemsSummary =
                    item.items.length === 1 ? item.items[0].name : `${item.items[0].name} + ${item.items.length - 1} more`;

                  return (
                    <React.Fragment key={item.id}>
                      <TableRow className="hover:bg-muted/50">
                        <TableCell>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => toggleRow(item.id)}>
                            {isExpanded ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium font-mono text-sm">{item.id}</TableCell>
                        <TableCell className="max-w-[300px] truncate">{itemsSummary}</TableCell>
                        <TableCell className="text-center">{totalQty}</TableCell>
                        <TableCell className="text-right font-semibold">${item.total.toFixed(2)}</TableCell>
                        <TableCell>
                          <StatusBadge status={item.status} />
                        </TableCell>
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
                                <DropdownMenuItem onClick={() => handleEditQuote(item)}>
                                  <EditIcon className="h-4 w-4 mr-2" />
                                  Edit Quote
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDownloadPDF(item)}>
                                  <DownloadIcon className="h-4 w-4 mr-2" />
                                  Download PDF
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>

                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={7} className="bg-muted/30 p-0">
                            <div className="p-4">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-[20%]">Part Number</TableHead>
                                    <TableHead className="w-[40%]">Product Name</TableHead>
                                    <TableHead className="w-[10%] text-center">Qty.</TableHead>
                                    <TableHead className="w-[12%] text-right">Price</TableHead>
                                    <TableHead className="w-[18%]">Tracking</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {item.items.map((lineItem, idx) => (
                                    <TableRow key={`${item.id}-item-${idx}`}>
                                      <TableCell className="font-mono text-sm">{lineItem.partNumber}</TableCell>
                                      <TableCell>{lineItem.name}</TableCell>
                                      <TableCell className="text-center">{lineItem.quantity}</TableCell>
                                      <TableCell className="text-right font-medium">
                                        ${(parseFloat(lineItem.price) * lineItem.quantity).toFixed(2)}
                                      </TableCell>
                                      <TableCell>
                                        {lineItem.tracking ? (
                                          <a
                                            href={`https://www.ups.com/track?tracknum=${lineItem.tracking}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="font-mono text-sm text-blue-600 hover:underline"
                                          >
                                            {lineItem.tracking}
                                          </a>
                                        ) : (
                                          <span className="text-sm text-muted-foreground">N/A</span>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Quote {editingQuote?.id}</DialogTitle>
            <DialogDescription>Update quantities or remove items from this quote.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {editedItems.map((item, index) => (
              <Card key={item.partNumber}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 space-y-2">
                      <div>
                        <h4 className="font-semibold">{item.name}</h4>
                        <p className="text-sm text-muted-foreground">Part #: {item.partNumber}</p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`qty-${index}`} className="text-sm">
                            Quantity:
                          </Label>
                          <div className="flex items-center gap-1">
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleUpdateQuantity(item.partNumber, item.quantity - 1)}>
                              <MinusIcon className="h-3 w-3" />
                            </Button>
                            <Input
                              id={`qty-${index}`}
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleUpdateQuantity(item.partNumber, parseInt(e.target.value) || 1)}
                              className="h-8 w-16 text-center"
                            />
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleUpdateQuantity(item.partNumber, item.quantity + 1)}>
                              <PlusIcon className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-auto">
                          <span className="text-sm text-muted-foreground">${item.price} each</span>
                          <span className="font-semibold">${(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleRemoveItem(item.partNumber)}>
                      <TrashIcon className="h-4 w-4" />
                      <span className="sr-only">Remove item</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {editedItems.length === 0 && <div className="text-center py-8 text-muted-foreground">No items in this quote. Add items to continue.</div>}

            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Total:</span>
                <span className="text-2xl font-bold">${calculateEditedTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancelEdit}>
              Cancel
            </Button>
            <Button onClick={handleSaveQuote} disabled={editedItems.length === 0}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
