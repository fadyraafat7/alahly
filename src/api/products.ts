import { z } from 'zod'
import { apiGet } from './client'
import type { Product, ProductPage, ProductQuery, ProductVariation } from '../types/product'

const productSchema = z.object({ id: z.number(), name: z.string(), slug: z.string(), permalink: z.string().default(''), type: z.string().default('simple'), description: z.string().default(''), short_description: z.string().default(''), sku: z.string().default(''), price: z.string().default(''), regular_price: z.string().default(''), sale_price: z.string().default(''), on_sale: z.boolean().default(false), stock_status: z.string().default('instock'), stock_quantity: z.number().nullable().default(null), average_rating: z.string().default('0'), rating_count: z.number().default(0), images: z.array(z.object({ id: z.number(), src: z.string(), name: z.string().default(''), alt: z.string().default('') })).default([]), categories: z.array(z.object({ id: z.number(), name: z.string(), slug: z.string() })).default([]), tags: z.array(z.object({ id: z.number(), name: z.string(), slug: z.string() })).default([]), attributes: z.array(z.object({ id: z.number().default(0), name: z.string(), option: z.string().default(''), options: z.array(z.string()).default([]), variation: z.boolean().default(false), visible: z.boolean().default(true) })).default([]), variations: z.array(z.number()).default([]), related_ids: z.array(z.number()).default([]) }).passthrough()
const unwrap = (payload: unknown) => Array.isArray(payload) ? payload : (payload as { items?: unknown[] }).items ?? []
const pageMeta = (payload: unknown, headers: Headers, count: number) => ({ total: Number(headers.get('x-wp-total') ?? (payload as { total?: number }).total ?? count), totalPages: Number(headers.get('x-wp-totalpages') ?? (payload as { totalPages?: number }).totalPages ?? 1) })

export async function getProducts(params: ProductQuery = {}): Promise<ProductPage> {
  const { data, headers } = await apiGet<unknown>('/products', params)
  const items = z.array(productSchema).parse(unwrap(data)) as Product[]
  return { items, ...pageMeta(data, headers, items.length) }
}
export async function getProduct(slug: string): Promise<Product | undefined> {
  const result = await getProducts({ search: slug, per_page: 20 })
  return result.items.find((product) => product.slug === slug)
}
export async function getVariations(productId: number): Promise<ProductVariation[]> {
  const { data } = await apiGet<unknown>(`/products/${productId}/variations`, { per_page: 100 })
  return z.array(z.object({ id: z.number(), price: z.string().default(''), regular_price: z.string().default(''), sale_price: z.string().default(''), stock_status: z.string().default('instock'), attributes: z.array(z.object({ name: z.string(), option: z.string() })).default([]), image: z.object({ id: z.number(), src: z.string(), name: z.string().default(''), alt: z.string().default('') }).optional() })).parse(unwrap(data))
}
