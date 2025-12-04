"use client"
// portal/(app)/shop/page.tsx

import { SiteHeader } from "@/components/site-header"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { AlertCircle, SearchIcon, MinusIcon, PlusIcon } from "lucide-react"
import { useState, useEffect, useMemo } from "react"
import { useQuote } from "@/contexts/quote-context"
import { getApi } from "@/lib/apiClient"
import { toast } from "sonner"
import Image from "next/image";

interface Product {
  id: number
  name: string
  partNumber: string
  category: string
  price: number
  notes?: string
  image?: string
  archived?: boolean
}

export default function ShopPage() {
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>("All Products")
  const { addItem, items: quoteItems } = useQuote()

  useEffect(() => {
    const controller = new AbortController()

    const fetchProducts = async () => {
      try {
        setLoading(true)
        setError(null)

        const payload = await getApi("/products", { signal: controller.signal })

        if (!payload) throw new Error("Empty API response")

        if (payload.success && Array.isArray(payload.data?.products)) {
          const normalized: Product[] = payload.data.products
            .map((p: any) => ({
              ...p,
              price:
                typeof p.price === "number"
                  ? p.price
                  : Number.parseFloat(String(p.price)) || 0,
            }))
            .filter((p: Product) => !p.archived)

          setProducts(normalized)
        } else {
          throw new Error(payload.message || "Failed to load products")
        }
      } catch (err) {
        if ((err as any)?.name !== "AbortError") {
          setError(err instanceof Error ? err.message : String(err))
          console.error("Error fetching products:", err)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
    return () => controller.abort()
  }, [])

  // group products and sort products alphabetically per category
  const productsByCategory = useMemo(() => {
    const grouped: Record<string, Product[]> = {}

    products.forEach((product) => {
      const category = product.category || "Other"
      if (!grouped[category]) grouped[category] = []
      grouped[category].push(product)
    })

    // sort products inside each category alphabetically by name (case-insensitive)
    Object.keys(grouped).forEach((cat) => {
      grouped[cat].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      )
    })

    return grouped
  }, [products])

  // categories alphabetically
  const allCategories = useMemo(() => {
    return Object.keys(productsByCategory).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    )
  }, [productsByCategory])

  // filter logic (search + selected category)
  const filteredProductsByCategory = useMemo(() => {
    let base = productsByCategory

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const filtered: Record<string, Product[]> = {}

      Object.entries(productsByCategory).forEach(([category, items]) => {
        const matches = items.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.partNumber.toLowerCase().includes(q)
        )
        if (matches.length) filtered[category] = matches
      })

      base = filtered
    }

    if (selectedCategory !== "All Products") {
      base = {
        [selectedCategory]: base[selectedCategory] || [],
      }
    }

    return base
  }, [productsByCategory, searchQuery, selectedCategory])

  const updateQuantity = (id: string, change: number) => {
    setQuantities((prev) => {
      const current = prev[id] ?? 1
      const next = Math.max(1, current + change)
      return { ...prev, [id]: next }
    })
  }

  const getQuantity = (id: string) => quantities[id] ?? 1

  const handleAddToQuote = (product: Product) => {
    const quantity = getQuantity(product.partNumber)

    addItem({
      partNumber: product.partNumber,
      name: product.name,
      price:
        typeof product.price === "number"
          ? product.price.toFixed(2)
          : String(product.price ?? ""),
      quantity,
      image: product.image,
      notes: product.notes,
    })

    setQuantities((prev) => {
      const updated = { ...prev }
      delete updated[product.partNumber]
      return updated
    })

    toast.success("Item added to the Quote successfully", {
    icon: <AlertCircle className="w-5 h-5 text-green-500" />,
    });
  }

  if (loading) {
    return (
      <>
        <SiteHeader title="Shop" />
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="text-muted-foreground">Loading products...</p>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <SiteHeader title="Shop" />
        <div className="flex flex-1 items-center justify-center p-6">
          <p className="text-red-500">{error}</p>
        </div>
      </>
    )
  }

  return (
    <>
      <SiteHeader title="Shop" />

      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <div>
          <h1 className="text-3xl font-bold">Shop</h1>
          <p className="text-muted-foreground">
            Browse our catalog and add items to your quote
          </p>
        </div>

        <div className="sticky top-4 z-20 bg-white/90 backdrop-blur-sm rounded-md py-2 px-3 max-w-2xl">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* category buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === "All Products" ? "default" : "outline"}
            onClick={() => setSelectedCategory("All Products")}
          >
            All Products
          </Button>

          {allCategories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>

        {/* render categories in the order of allCategories (alphabetical),
            and only show categories present in filteredProductsByCategory */}
        {allCategories
          .filter((cat) => (filteredProductsByCategory[cat] || []).length > 0)
          .map((category) => {
            const items = filteredProductsByCategory[category] || []

            return (
              <div key={category} className="space-y-4">
                <h2 className="text-xl font-semibold">{category}</h2>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {items.map((product) => {
                    const id = product.partNumber

                    // determine if this product is already in the quote (disable button)
                    const isAdded = quoteItems.some(
                      (qi) => qi.partNumber === product.partNumber
                    )

                    return (
                      <Card key={id}>
                        <CardHeader>
                          {product.image && (
                            <div className="aspect-square bg-muted rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-full h-full object-contain"
                              />
                            </div>
                          )}

                          <CardTitle className="text-lg">{product.name}</CardTitle>
                          <CardDescription className="text-xs">
                            Part #: {product.partNumber}
                          </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-4">
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {product.notes}
                          </p>

                          <div className="text-2xl font-bold">
                            ${product.price.toFixed(2)}
                          </div>

                          {/* Quantity area: always reserve height so cards align */}
                          <div className="flex items-center justify-center gap-2 h-10">
                            {isAdded ? (
                              // reserved empty block keeps card height consistent
                              <div className="h-8 w-full" />
                            ) : (
                              <>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => updateQuantity(id, -1)}
                                >
                                  <MinusIcon className="h-4 w-4" />
                                </Button>

                                <span className="w-10 text-center">{getQuantity(id)}</span>

                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => updateQuantity(id, 1)}
                                >
                                  <PlusIcon className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>

                          <Button
                            className={`w-full h-10 transition-colors disabled:opacity-70 ${
                              isAdded ? "bg-gray-200 text-gray-600 hover:bg-gray-200" : ""
                            }`}
                            onClick={() => handleAddToQuote(product)}
                            disabled={isAdded}
                          >
                            {isAdded ? "Item added" : "Add to Quote"}
                          </Button>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )
          })}
      </div>
    </>
  )
}
