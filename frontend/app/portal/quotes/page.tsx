"use client"

import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { MinusIcon, PlusIcon, TrashIcon } from "lucide-react"
import { useQuote } from "@/contexts/quote-context"
import { useRouter } from "next/navigation"

export default function QuotesPage() {
  const { items, updateQuantity, removeItem, getTotalPrice, clearQuote } = useQuote()
  const router = useRouter()

  const total = getTotalPrice()

  return (
    <>
      <SiteHeader title="Quotes" />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Quote Request</h1>
            <p className="text-muted-foreground">
              {items.length} {items.length === 1 ? "item" : "items"} in your quote
            </p>
          </div>
          {items.length > 0 && (
            <Button variant="outline" onClick={clearQuote}>
              Clear All
            </Button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-12">
            <p className="text-muted-foreground text-center">
              Your quote is empty. Add items from the shop to get started.
            </p>
            <Button onClick={() => router.push("/shop")}>Browse Shop</Button>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <Card key={item.partNumber}>
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      {item.image && (
                        <div className="h-24 w-24 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold">{item.name}</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              Part #: {item.partNumber}
                            </p>
                            {item.notes && (
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                {item.notes}
                              </p>
                            )}
                          </div>
                          <p className="font-semibold">${item.price}</p>
                        </div>
                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() =>
                                updateQuantity(item.partNumber, item.quantity - 1)
                              }
                            >
                              <MinusIcon className="h-4 w-4" />
                            </Button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() =>
                                updateQuantity(item.partNumber, item.quantity + 1)
                              }
                            >
                              <PlusIcon className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-medium">
                              ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => removeItem(item.partNumber)}
                            >
                              <TrashIcon className="h-4 w-4 mr-2" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="lg:col-span-1">
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle>Quote Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div key={item.partNumber} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {item.name} x{item.quantity}
                        </span>
                        <span>
                          ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="font-semibold">Total</span>
                    <span className="font-bold text-lg">${total.toFixed(2)}</span>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                  <Button className="w-full" size="lg">
                    Submit Quote Request
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push("/shop")}
                  >
                    Continue Shopping
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
