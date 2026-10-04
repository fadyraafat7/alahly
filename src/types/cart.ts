import type { Product } from './product'
export interface CartItem { key: string; product: Product; quantity: number; variationId?: number; selectedAttributes?: Record<string, string> }
