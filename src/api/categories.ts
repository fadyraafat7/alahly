import { z } from 'zod'
import { apiGet } from './client'
import type { Category } from '../types/category'
const categorySchema = z.object({ id: z.number(), name: z.string(), slug: z.string(), description: z.string().default(''), count: z.number().default(0), image: z.object({ id: z.number(), src: z.string(), alt: z.string().default('') }).nullable().default(null) })
export async function getCategories(): Promise<Category[]> { const { data } = await apiGet<unknown>('/products/categories', { per_page: 100 }); return z.array(categorySchema).parse(Array.isArray(data) ? data : (data as { items?: unknown[] }).items ?? []) }
export async function getCategory(slug: string): Promise<Category | undefined> { return (await getCategories()).find((category) => category.slug === slug) }
