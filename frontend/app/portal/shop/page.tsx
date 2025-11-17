"use client"

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
import { SearchIcon, MinusIcon, PlusIcon } from "lucide-react"
import { useState, useEffect, useMemo } from "react"
import Papa from "papaparse"
import { useQuote } from "@/contexts/quote-context"
import { useCart } from "@/contexts/cart-context"
import { useRouter } from "next/navigation"

interface Product {
  Name: string
  "Part Number": string
  Category: string
  Notes: string
  Price: string
  Archived: string
  Image: string
}

export default function ShopPage() {
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>("All Products")
  const { addItem } = useQuote()
  const { addItem: addToCart } = useCart()
  const router = useRouter()

  useEffect(() => {
    fetch("/data/products.csv")
      .then((response) => response.text())
      .then((csv) => {
        Papa.parse<Product>(csv, {
          header: true,
          complete: (results) => {
            const filtered = results.data.filter(
              (product) =>
                product.Name &&
                product["Part Number"] &&
                product.Category &&
                product.Archived !== "true"
            )
            setProducts(filtered)
            setLoading(false)
          },
        })
      })
  }, [])

  const productsByCategory = useMemo(() => {
    const grouped: Record<string, Product[]> = {}
    products.forEach((product) => {
      const category = product.Category || "Other"
      if (!grouped[category]) {
        grouped[category] = []
      }
      grouped[category].push(product)
    })
    return grouped
  }, [products])

  const allCategories = useMemo(() => {
    const categories = Object.keys(productsByCategory)
    const order = ["Cart", "Power", "Wiring"]
    return categories.sort((catA, catB) => {
      const indexA = order.indexOf(catA)
      const indexB = order.indexOf(catB)

      if (indexA !== -1 && indexB !== -1) return indexA - indexB
      if (indexA !== -1) return -1
      if (indexB !== -1) return 1
      return catA.localeCompare(catB)
    })
  }, [productsByCategory])

  const filteredProductsByCategory = useMemo(() => {
    let baseCategories = productsByCategory

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const filtered: Record<string, Product[]> = {}

      Object.entries(productsByCategory).forEach(([category, items]) => {
        const matchingProducts = items.filter(
          (product) =>
            product.Name.toLowerCase().includes(query) ||
            product["Part Number"].toLowerCase().includes(query)
        )
        if (matchingProducts.length > 0) {
          filtered[category] = matchingProducts
        }
      })

      baseCategories = filtered
    }

    // Filter by selected category
    if (selectedCategory !== "All Products") {
      baseCategories = {
        [selectedCategory]: baseCategories[selectedCategory] || []
      }
    }

    // Sort categories: Cart first, then Power, then Wiring, then alphabetically
    const sortedEntries = Object.entries(baseCategories).sort(([catA], [catB]) => {
      const order = ["Cart", "Power", "Wiring"]
      const indexA = order.indexOf(catA)
      const indexB = order.indexOf(catB)

      if (indexA !== -1 && indexB !== -1) return indexA - indexB
      if (indexA !== -1) return -1
      if (indexB !== -1) return 1
      return catA.localeCompare(catB)
    })

    return Object.fromEntries(sortedEntries)
  }, [productsByCategory, searchQuery, selectedCategory])

  const updateQuantity = (productId: string, change: number) => {
    setQuantities((prev) => {
      const current = prev[productId] || 1
      const newValue = Math.max(1, current + change)
      return { ...prev, [productId]: newValue }
    })
  }

  const getQuantity = (productId: string) => quantities[productId] || 1

  const handleAddToQuote = (product: Product) => {
    const quantity = getQuantity(product["Part Number"])
    addItem({
      partNumber: product["Part Number"],
      name: product.Name,
      price: product.Price,
      quantity,
      image: product.Image,
      notes: product.Notes,
    })
    // Reset quantity after adding
    setQuantities((prev) => {
      const newQuantities = { ...prev }
      delete newQuantities[product["Part Number"]]
      return newQuantities
    })
    // Navigate to quotes page
    router.push("/quotes")
  }

  const handleAddToCart = (product: Product) => {
    const quantity = getQuantity(product["Part Number"])
    addToCart({
      partNumber: product["Part Number"],
      name: product.Name,
      price: product.Price,
      quantity,
      image: product.Image,
      notes: product.Notes,
    })
    // Reset quantity after adding
    setQuantities((prev) => {
      const newQuantities = { ...prev }
      delete newQuantities[product["Part Number"]]
      return newQuantities
    })
  }

  if (loading) {
    return (
      <>
        <SiteHeader title="Shop" />
        <div className="flex flex-1 items-center justify-center p-4">
          <p className="text-muted-foreground">Loading products...</p>
        </div>
      </>
    )
  }

  return (
    <>
      <SiteHeader title="Shop" />
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Shop</h1>
            <p className="text-muted-foreground">
              Browse our catalog and add items to your quote
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="relative max-w-2xl">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by part number or description..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === "All Products" ? "default" : "outline"}
              onClick={() => setSelectedCategory("All Products")}
            >
              All Products
            </Button>
            {allCategories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {Object.entries(filteredProductsByCategory).length === 0 ? (
          <div className="flex flex-1 items-center justify-center p-12">
            <p className="text-muted-foreground">No products found matching your search.</p>
          </div>
        ) : (
          Object.entries(filteredProductsByCategory).map(([category, categoryProducts]) => (
            <div key={category} className="space-y-4">
              <h2 className="text-2xl font-semibold">{category}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {categoryProducts.map((product) => {
                  const productId = product["Part Number"]
                  return (
                    <Card key={productId}>
                      <CardHeader>
                        {product.Image && (
                          <div className="aspect-square rounded-lg bg-muted mb-4 flex items-center justify-center overflow-hidden">
                            <img
                              src={product.Image}
                              alt={product.Name}
                              className="w-full h-full object-contain"
                            />
                          </div>
                        )}
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <CardTitle className="text-lg leading-tight">
                              {product.Name}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              Part #: {product["Part Number"]}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {product.Notes || "No description available"}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold">
                            ${product.Price}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(productId, -1)}
                          >
                            <MinusIcon className="h-4 w-4" />
                          </Button>
                          <span className="w-12 text-center font-medium">
                            {getQuantity(productId)}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(productId, 1)}
                          >
                            <PlusIcon className="h-4 w-4" />
                          </Button>
                        </div>
                        <Button
                          className="w-full"
                          onClick={() => handleAddToQuote(product)}
                        >
                          Add to Quote
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )
}
