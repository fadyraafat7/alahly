import { z } from 'zod'
import { apiGet, type ApiContext } from './client'
import type { Category } from '../types/category'
const categorySchema = z.object({ id: z.number(), name: z.string(), slug: z.string(), description: z.string().default(''), count: z.number().default(0), image: z.object({ id: z.number(), src: z.string(), alt: z.string().default('') }).nullable().default(null) })
export async function getCategories(context?: ApiContext): Promise<Category[]> { const { data } = await apiGet<unknown>('/products/categories', { per_page: 100 }, context); return z.array(categorySchema).parse(Array.isArray(data) ? data : (data as { items?: unknown[] }).items ?? []) }
export async function getCategory(slug: string, context?: ApiContext): Promise<Category | null> { return (await getCategories(context)).find((category) => category.slug === slug) ?? null }
