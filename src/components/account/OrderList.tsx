import type { CustomerOrder } from '../../types/order'
import { formatPrice } from '../../utils/format'

const statuses: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending payment', className: 'bg-amber-50 text-amber-800' },
  processing: { label: 'Processing', className: 'bg-blue-50 text-blue-800' },
  'on-hold': { label: 'On hold', className: 'bg-amber-50 text-amber-800' },
  completed: { label: 'Completed', className: 'bg-green-50 text-green-800' },
  cancelled: { label: 'Cancelled', className: 'bg-sand text-ink/75' },
  refunded: { label: 'Refunded', className: 'bg-purple-50 text-purple-800' },
  failed: { label: 'Failed', className: 'bg-red-50 text-red-800' },
  'checkout-draft': { label: 'Draft', className: 'bg-sand text-ink/75' },
}

function OrderStatus({ status }: { status: string }) {
  const appearance = Object.hasOwn(statuses, status) ? statuses[status] : undefined
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold capitalize ${appearance?.className ?? 'bg-sand text-ink/75'}`}>
      {appearance?.label ?? status.replace(/[-_]/g, ' ')}
    </span>
  )
}

export function OrderList({ orders }: { orders: CustomerOrder[] }) {
  return (
    <ul className="divide-y divide-ink/10 overflow-hidden rounded-2xl border border-ink/10 bg-white">
      {orders.map((order) => (
        <li key={order.id}>
          <article className="grid gap-4 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-center sm:p-6" aria-label={`Order ${order.number}`}>
            <div>
              <h2 className="font-bold">Order #{order.number}</h2>
              <p className="mt-2 text-sm text-ink/65">
                {order.date_created ? (
                  <time dateTime={order.date_created}>
                    {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(order.date_created))}
                  </time>
                ) : 'Date unavailable'}
              </p>
            </div>
            <div><span className="sr-only">Status: </span><OrderStatus status={order.status} /></div>
            <div className="flex items-baseline justify-between gap-4 sm:block sm:text-right">
              <p className="text-xs text-ink/65">Order total</p>
              <p className="font-bold sm:mt-1">{formatPrice(order.total, order.currency)} <span className="text-xs font-normal text-ink/65">{order.currency}</span></p>
            </div>
          </article>
        </li>
      ))}
    </ul>
  )
}

export function OrdersSkeleton() {
  return (
    <div role="status">
      <span className="sr-only">Loading your orders...</span>
      <div aria-hidden="true" className="space-y-3 motion-safe:animate-pulse">
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex items-center justify-between gap-6 rounded-2xl border border-ink/10 bg-white p-6">
            <div className="space-y-3"><div className="h-4 w-28 rounded bg-sand" /><div className="h-3 w-20 rounded bg-sand" /></div>
            <div className="h-7 w-24 rounded-full bg-sand" />
          </div>
        ))}
      </div>
    </div>
  )
}
