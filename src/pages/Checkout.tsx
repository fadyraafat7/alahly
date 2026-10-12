import { useEffect } from 'react'
import { useCart } from '../store/CartContext'
import { CartFeedback } from '../components/cart/CartFeedback'
import { Link } from 'react-router'

const checkoutUrl = `${(import.meta.env.VITE_WP_SITE_URL || 'http://alahly.test').replace(/\/$/, '')}/checkout/`

export function Checkout() {
  const { canCheckout, isSyncing } = useCart()
  useEffect(() => { if (canCheckout()) window.location.replace(checkoutUrl) }, [canCheckout])
  if (!canCheckout()) return <main className="mx-auto max-w-4xl px-6 py-20 text-center">
    <p role="status">{isSyncing ? 'Confirming your bag...' : 'Review your bag before continuing to checkout.'}</p>
    <CartFeedback />
    <Link to="/cart" className="mt-6 inline-block text-sm font-bold text-moss underline">View your bag</Link>
  </main>

  return <main className="mx-auto max-w-4xl px-6 py-20 text-center"><p className="text-xs font-bold uppercase tracking-widest text-clay">Secure checkout</p><h1 className="mt-3 font-display text-5xl font-bold">Taking you to checkout…</h1><p className="mt-5 text-sm text-ink/60">WooCommerce will securely collect your address, shipping and payment details.</p><a href={checkoutUrl} className="mt-6 inline-block text-sm font-bold text-moss underline">Continue to checkout</a></main>
}
