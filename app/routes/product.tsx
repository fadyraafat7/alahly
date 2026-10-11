import { HydrationBoundary } from '@tanstack/react-query'
import type { Route } from './+types/product'
import { ProductDetails } from '../../src/pages/ProductDetails'
import { loadCatalog } from '../lib/catalog.server'
import { catalogMeta } from '../lib/meta'
export { RouteError as ErrorBoundary } from '../components/RouteError'
export const loader = (args: Route.LoaderArgs) => loadCatalog('product', args)
export const meta = ({ data }: Route.MetaArgs) => catalogMeta(data?.seo)
export default function Page({ loaderData }: Route.ComponentProps) {
  return <HydrationBoundary state={loaderData.dehydratedState}><ProductDetails /></HydrationBoundary>
}
