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
  return { search: params.get('search') || undefined, category: number('category', 1, true),
    min_price: number('min_price', 0), max_price: number('max_price', 0),
    page: number('page', 1, true) ?? 1, per_page: 12, orderby,
    order: orderby === 'title' ? 'asc' : 'desc', on_sale: params.get('on_sale') === 'true' || undefined }
}
export function categoryParams(params: URLSearchParams, category?: number): ProductQuery {
  const { page, orderby, order } = catalogParams(params)
  return { category, page, per_page: 12, orderby, order }
}
