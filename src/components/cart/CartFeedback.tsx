import { useCart } from '../../store/CartContext'
export function CartFeedback() {
  const { error, isSyncing, refreshCart } = useCart()
  if (!error) return null
  return <div role="alert" className="my-4 rounded-2xl border border-clay/30 bg-white p-5 text-sm">
    <p>{error}</p>
    <button type="button" disabled={isSyncing} onClick={() => void refreshCart()} className="mt-3 font-bold text-moss underline disabled:opacity-50">Refresh bag</button>
  </div>
}
