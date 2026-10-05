import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import {
  addStoreCartItem,
  getStoreCart,
  removeStoreCartItem,
  updateStoreCartItem,
} from "../api/cart";
import type { CartItem } from "../types/cart";
import type { Product } from "../types/product";

interface CartContextValue {
  items: CartItem[];
  isOpen: boolean;
  itemCount: number;
  subtotal: number;
  isSyncing: boolean;
  addItem: (
    product: Product,
    quantity?: number,
    variationId?: number,
    selectedAttributes?: Record<string, string>,
  ) => Promise<void>;
  updateQuantity: (key: string, quantity: number) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  setOpen: (open: boolean) => void;
}
const CartContext = createContext<CartContextValue | undefined>(undefined);
const itemPrice = (item: CartItem) =>
  Number(
    item.product.sale_price ||
      item.product.price ||
      item.product.regular_price ||
      0,
  );

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(true);
  useEffect(() => {
    getStoreCart()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setIsSyncing(false));
  }, []);
  const addItem = useCallback(
    async (
      product: Product,
      quantity = 1,
      _variationId?: number,
      selectedAttributes?: Record<string, string>,
    ) => {
      setIsSyncing(true);
      try {
        const variation = selectedAttributes
          ? Object.entries(selectedAttributes).map(([attribute, value]) => ({
              attribute,
              value,
            }))
          : undefined;
        setItems(await addStoreCartItem(product.id, quantity, variation));
        setOpen(true);
      } finally {
        setIsSyncing(false);
      }
    },
    [],
  );
  const updateQuantity = useCallback(async (key: string, quantity: number) => {
    setIsSyncing(true);
    try {
      setItems(
        quantity < 1
          ? await removeStoreCartItem(key)
          : await updateStoreCartItem(key, quantity),
      );
    } finally {
      setIsSyncing(false);
    }
  }, []);
  const removeItem = useCallback(async (key: string) => {
    setIsSyncing(true);
    try {
      setItems(await removeStoreCartItem(key));
    } finally {
      setIsSyncing(false);
    }
  }, []);
  const value = useMemo(
    () => ({
      items,
      isOpen,
      isSyncing,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: items.reduce(
        (sum, item) => sum + itemPrice(item) * item.quantity,
        0,
      ),
      addItem,
      updateQuantity,
      removeItem,
      setOpen,
    }),
    [items, isOpen, isSyncing, addItem, updateQuantity, removeItem],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
// This hook is intentionally colocated with its provider so cart consumers share one typed contract.
// eslint-disable-next-line react-refresh/only-export-components
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
};
