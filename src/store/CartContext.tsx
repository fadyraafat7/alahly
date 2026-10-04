import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { CartItem } from '../types/cart'
import type { Product } from '../types/product'

interface CartContextValue { items: CartItem[]; isOpen: boolean; itemCount: number; subtotal: number; addItem: (product: Product, quantity?: number, variationId?: number, selectedAttributes?: Record<string, string>) => void; updateQuantity: (key: string, quantity: number) => void; removeItem: (key: string) => void; setOpen: (open: boolean) => void }
const CartContext = createContext<CartContextValue | undefined>(undefined)
const storageKey = 'alahly-cart'
const itemPrice = (item: CartItem) => Number(item.product.sale_price || item.product.price || item.product.regular_price || 0)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => { try { return JSON.parse(localStorage.getItem(storageKey) ?? '[]') as CartItem[] } catch { return [] } })
  const [isOpen, setOpen] = useState(false)
  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(items)) }, [items])
  const addItem = useCallback((product: Product, quantity = 1, variationId?: number, selectedAttributes?: Record<string, string>) => {
    const key = `${product.id}-${variationId ?? 'base'}`
    setItems((current) => { const existing = current.find((item) => item.key === key); return existing ? current.map((item) => item.key === key ? { ...item, quantity: item.quantity + quantity } : item) : [...current, { key, product, quantity, variationId, selectedAttributes }] })
    setOpen(true)
  }, [])
  const updateQuantity = useCallback((key: string, quantity: number) => setItems((current) => quantity < 1 ? current.filter((item) => item.key !== key) : current.map((item) => item.key === key ? { ...item, quantity } : item)), [])
  const removeItem = useCallback((key: string) => setItems((current) => current.filter((item) => item.key !== key)), [])
  const value = useMemo(() => ({ items, isOpen, itemCount: items.reduce((sum, item) => sum + item.quantity, 0), subtotal: items.reduce((sum, item) => sum + itemPrice(item) * item.quantity, 0), addItem, updateQuantity, removeItem, setOpen }), [items, isOpen, addItem, updateQuantity, removeItem])
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
// This hook is intentionally colocated with its provider so cart consumers share one typed contract.
// eslint-disable-next-line react-refresh/only-export-components
export const useCart = () => { const context = useContext(CartContext); if (!context) throw new Error('useCart must be used within CartProvider'); return context }
