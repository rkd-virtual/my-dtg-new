"use client"

// portal/(app)/quotes/page.tsx
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AlertCircle, MinusIcon, PlusIcon, TrashIcon } from "lucide-react"

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
import { useQuote } from "@/contexts/quote-context"
import { getApi } from "@/lib/apiClient"

export default function QuotesPage() {
  const { items, updateQuantity, removeItem, getTotalPrice, clearQuote } = useQuote()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const total = getTotalPrice()

  // Check whether the user has a shipping address.
  // Uses getApi (returns parsed body) and falls back to localStorage.
  async function hasShippingAddress(): Promise<boolean> {
  try {
    const data = await getApi("/settings/shipping")  
    //console.log("Shipping data:", data)

    if (!data) return false

    // Validate meaningful presence of shipping fields
    const hasAddress =
      Boolean(data.address1?.trim()) ||
      Boolean(data.city?.trim()) ||
      Boolean(data.state?.trim()) ||
      Boolean(data.zip?.trim()) ||
      Boolean(data.country?.trim()) ||
      Boolean(data.shipto?.trim())

    if (!hasAddress) {
      return false
    }

    return true

  } catch (err: any) {
    const status = err?.status ?? err?.response?.status

    if (status === 404) {
      return false
    }

    if (status === 401) {
      toast.error("Please login to use shipping features.", {
        icon: <AlertCircle className="w-5 h-5 text-red-500" />,
      })
      return false
    }
  }

  // Fallback: client-side saved address
  try {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem("shippingAddress")
      if (!raw) return false

      try {
        const parsed = JSON.parse(raw)
        return Boolean(
          parsed &&
          (parsed.address1 || parsed.city || parsed.zip || parsed.postalCode)
        )
      } catch {
        return Boolean(raw.trim())
      }
    }
  } catch {}

  return false
}


  async function handleSubmitQuote() {
    if (items.length === 0) {
      toast.error("Your quote is empty. Add items before submitting.", {
        icon: <AlertCircle className="w-5 h-5 text-red-500" />,
      })
      return
    }

    setIsSubmitting(true)
    const ok = await hasShippingAddress()
    if (!ok) {
      toast.error("Please fill up your shipping address before submitting quote.", {
        icon: <AlertCircle className="w-5 h-5 text-red-500" />,
      })
      router.push("/portal/settings#shipping")
      setIsSubmitting(false)
      return
    }

    // Mock submit (replace with real API call when ready)
    toast.success("Quote submitted successfully.", {
        icon: <AlertCircle className="w-5 h-5 text-green-500" />,
      })

    clearQuote()
    // router.push("/portal/quotes/confirmation") // uncomment if you have a confirmation page
    setIsSubmitting(false)
  }

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
            <Button onClick={() => router.push("/portal/shop")}>Browse Shop</Button>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              {items.map((item: any) => (
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
                              onClick={() => updateQuantity(item.partNumber, item.quantity - 1)}
                            >
                              <MinusIcon className="h-4 w-4" />
                            </Button>

                            <span className="w-8 text-center">{item.quantity}</span>

                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateQuantity(item.partNumber, item.quantity + 1)}
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
                    {items.map((item: any) => (
                      <div key={item.partNumber} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {item.name} x{item.quantity}
                        </span>
                        <span>${(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
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
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleSubmitQuote}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Checking..." : "Submit Quote Request"}
                  </Button>

                  <Button variant="outline" className="w-full" onClick={() => router.push("/portal/shop")}>
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
