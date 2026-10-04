import type { Product } from '../../types/product'
import { ProductCard } from './ProductCard'
export function ProductGrid({ products }: { products: Product[] }) { return <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div> }
