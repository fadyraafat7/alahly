import { useQuery } from '@tanstack/react-query'
import { getCustomerOrders } from '../api/auth'

export const useOrders = (token?: string, userId?: number) =>
  useQuery({
    queryKey: ['orders', userId],
    queryFn: () => getCustomerOrders(token!),
    enabled: Boolean(token && userId),
    retry: false,
  })