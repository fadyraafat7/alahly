import { ArrowLeft, LockKeyhole } from "lucide-react";
import { Link } from "react-router-dom";
import { CartSummary } from "../components/cart/CartSummary";
import { useCart } from "../store/CartContext";
export function Checkout() {
  const { items } = useCart();
  if (!items.length)
    return (
      <main className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h1 className="font-display text-4xl font-bold">Your bag is empty</h1>
        <Link
          to="/products"
          className="mt-5 inline-block text-sm font-bold text-moss underline"
        >
          Return to the shop
        </Link>
      </main>
    );
  return (
    <main className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
      <Link
        to="/cart"
        className="inline-flex items-center gap-2 text-sm font-bold text-moss"
      >
        <ArrowLeft size={16} />
        Back to bag
      </Link>
      <div className="mt-7 grid gap-10 lg:grid-cols-[1fr_360px]">
        <section>
          <p className="text-xs font-bold uppercase tracking-widest text-clay">
            Secure checkout
          </p>
          <h1 className="mt-2 font-display text-5xl font-bold">
            Complete your order
          </h1>
          <div className="mt-7 rounded-2xl border border-ink/10 bg-white p-6">
            <LockKeyhole className="text-moss" size={24} />
            <h2 className="mt-4 font-display text-2xl font-bold">
              Checkout is completed securely by WooCommerce.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-ink/65">
              To process payment, taxes, shipping methods, and orders securely,
              connect your backendâ€™s checkout endpoint or redirect to your
              storeâ€™s WooCommerce checkout. The storefront intentionally does
              not handle WooCommerce credentials.
            </p>
            <p className="mt-5 rounded-xl bg-sand p-4 text-sm text-ink/70">
              This storefront keeps checkout inside WooCommerce rather than
              creating a separate order system. Add your store’s payment-method
              and address form here before calling the Store API checkout
              endpoint.
            </p>
          </div>
        </section>
        <aside>
          <CartSummary checkout={false} />
        </aside>
      </div>
    </main>
  );
}
