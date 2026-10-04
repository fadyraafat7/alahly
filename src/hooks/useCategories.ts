import { useQuery } from '@tanstack/react-query'
import { getCategories, getCategory } from '../api/categories'
export const useCategories = () => useQuery({ queryKey: ['categories'], queryFn: getCategories, staleTime: 5 * 60_000 })
export const useCategory = (slug: string) => useQuery({ queryKey: ['category', slug], queryFn: () => getCategory(slug), enabled: Boolean(slug), staleTime: 5 * 60_000 })
