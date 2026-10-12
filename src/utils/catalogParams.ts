import type { ProductQuery } from '../types/product'
const sorts = ['date', 'price', 'title', 'popularity', 'rating'] as const
export function catalogParams(params: URLSearchParams): ProductQuery {
  const number = (key: string, minimum: number, integer = false) => {
    const text = params.get(key)
    if (text === null || text.trim() === '') return undefined
    const value = Number(text)
    return Number.isFinite(value) && value >= minimum && (!integer || Number.isInteger(value)) ? value : undefined
  }
  const orderby = sorts.find((sort) => sort === params.get('orderby')) ?? 'date'
  return { search: params.get('search')?.trim() || undefined, category: number('category', 1, true),
    min_price: number('min_price', 0), max_price: number('max_price', 0),
    page: number('page', 1, true) ?? 1, per_page: 12, orderby,
    order: orderby === 'title' || orderby === 'price' ? 'asc' : 'desc', on_sale: params.get('on_sale') === 'true' || undefined }
}

// Used for BOTH query keys and the outgoing request, including non-route callers.
export function normalizeProductQuery(params: ProductQuery = {}): ProductQuery {
  const positive = (value?: number) => Number.isSafeInteger(value) && value! > 0 ? value : undefined
  const price = (value?: number) => value !== undefined && Number.isFinite(value) && value >= 0 ? Math.round(value * 100) / 100 : undefined
  const orderby = sorts.find(sort => sort === params.orderby) ?? 'date'
  const normalized: ProductQuery = {
    page: positive(params.page) ?? 1,
    per_page: Math.min(positive(params.per_page) ?? 10, 100),
    orderby,
    order: params.order === 'asc' || params.order === 'desc' ? params.order : (orderby === 'price' || orderby === 'title' ? 'asc' : 'desc'),
    search: params.search?.trim() || undefined,
    slug: params.slug?.trim() || undefined,
    type: params.type?.trim() || undefined,
    category: positive(params.category), parent: positive(params.parent), related: positive(params.related),
    min_price: price(params.min_price), max_price: price(params.max_price),
    on_sale: params.on_sale, featured: params.featured,
  }
  return Object.fromEntries(Object.entries(normalized).filter(([, value]) => value !== undefined)) as ProductQuery
}
export function categoryParams(params: URLSearchParams, category?: number): ProductQuery {
  const { page, orderby, order } = catalogParams(params)
  return { category, page, per_page: 12, orderby, order }
}
