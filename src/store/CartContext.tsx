import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
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
import { createCartCoordinator } from './cartCoordinator';
import { useAuth } from './AuthContext';

interface CartContextValue {
  items: CartItem[];
  isOpen: boolean;
  itemCount: number;
  subtotal: number;
  isSyncing: boolean;
  error: string | null;
  refreshCart: () => Promise<boolean>;
  canCheckout: () => boolean;
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
  const [coordinator] = useState(() => createCartCoordinator<CartItem[]>(getStoreCart, []));
  const { sessionScope } = useAuth();
  const { items, isSyncing, error } = useSyncExternalStore(coordinator.subscribe, coordinator.getSnapshot, coordinator.getServerSnapshot);
  const [isOpen, setOpen] = useState(false);
  useEffect(() => {
    // A new React token does not mean the WordPress cookie handoff has finished.
    // Never reload the previous account's cookie cart during that transition.
    if (sessionScope === 0) void coordinator.refresh();
    else coordinator.reset('Your account session changed. Refresh your bag before continuing.');
    return () => coordinator.reset();
  }, [coordinator, sessionScope]);
  const addItem = useCallback(
    async (
      product: Product,
      quantity = 1,
      _variationId?: number,
      selectedAttributes?: Record<string, string>,
    ) => {
        const variation = selectedAttributes
          ? Object.entries(selectedAttributes).map(([attribute, value]) => ({
              attribute,
              value,
            }))
          : undefined;
        await coordinator.mutate(() => addStoreCartItem(product.id, quantity, variation));
        setOpen(true);
    },
    [coordinator],
  );
  const updateQuantity = useCallback(async (key: string, quantity: number) => {
    await coordinator.mutate(() =>
        quantity < 1
          ? removeStoreCartItem(key)
          : updateStoreCartItem(key, quantity),
      );
  }, [coordinator]);
  const removeItem = useCallback(async (key: string) => {
    await coordinator.mutate(() => removeStoreCartItem(key));
  }, [coordinator]);
  const value = useMemo(
    () => ({
      items,
      isOpen,
      isSyncing,
      error,
      refreshCart: coordinator.refresh,
      canCheckout: () => coordinator.canCheckout() && coordinator.getSnapshot().items.length > 0,
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
    [items, isOpen, isSyncing, error, coordinator, addItem, updateQuantity, removeItem],
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
