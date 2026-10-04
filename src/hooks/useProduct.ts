import { useQuery } from '@tanstack/react-query'
import { getProduct, getVariations } from '../api/products'
export const useProduct = (slug: string) => useQuery({ queryKey: ['product', slug], queryFn: () => getProduct(slug), enabled: Boolean(slug) })
export const useVariations = (id?: number, enabled = false) => useQuery({ queryKey: ['variations', id], queryFn: () => getVariations(id!), enabled: Boolean(id) && enabled })
