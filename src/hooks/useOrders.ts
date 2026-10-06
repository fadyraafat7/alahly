import { useQuery } from '@tanstack/react-query'
import { getCustomerOrders } from '../api/auth'
export const useOrders = (token?: string) => useQuery({ queryKey: ['orders'], queryFn: () => getCustomerOrders(token!), enabled: Boolean(token), retry: false })