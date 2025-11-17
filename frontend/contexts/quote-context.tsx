"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

export interface QuoteItem {
  partNumber: string
  name: string
  price: string
  quantity: number
  image?: string
  notes?: string
}

interface QuoteContextType {
  items: QuoteItem[]
  addItem: (item: QuoteItem) => void
  removeItem: (partNumber: string) => void
  updateQuantity: (partNumber: string, quantity: number) => void
  clearQuote: () => void
  getTotalItems: () => number
  getTotalPrice: () => number
}

const QuoteContext = createContext<QuoteContextType | undefined>(undefined)

export function QuoteProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<QuoteItem[]>([])
  const [mounted, setMounted] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem("quote-items")
    if (saved) {
      try {
        setItems(JSON.parse(saved))
      } catch (e) {
        console.error("Failed to load quote items", e)
      }
    }
  }, [])

  // Save to localStorage whenever items change
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("quote-items", JSON.stringify(items))
    }
  }, [items, mounted])

  const addItem = (newItem: QuoteItem) => {
    setItems((current) => {
      const existing = current.find((item) => item.partNumber === newItem.partNumber)
      if (existing) {
        return current.map((item) =>
          item.partNumber === newItem.partNumber
            ? { ...item, quantity: item.quantity + newItem.quantity }
            : item
        )
      }
      return [...current, newItem]
    })
  }

  const removeItem = (partNumber: string) => {
    setItems((current) => current.filter((item) => item.partNumber !== partNumber))
  }

  const updateQuantity = (partNumber: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(partNumber)
      return
    }
    setItems((current) =>
      current.map((item) =>
        item.partNumber === partNumber ? { ...item, quantity } : item
      )
    )
  }

  const clearQuote = () => {
    setItems([])
  }

  const getTotalItems = () => {
    return items.reduce((sum, item) => sum + item.quantity, 0)
  }

  const getTotalPrice = () => {
    return items.reduce((sum, item) => {
      const price = parseFloat(item.price) || 0
      return sum + price * item.quantity
    }, 0)
  }

  return (
    <QuoteContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearQuote,
        getTotalItems,
        getTotalPrice,
      }}
    >
      {children}
    </QuoteContext.Provider>
  )
}

export function useQuote() {
  const context = useContext(QuoteContext)
  if (context === undefined) {
    throw new Error("useQuote must be used within a QuoteProvider")
  }
  return context
}
