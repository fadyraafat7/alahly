import { ArrowLeft, PackageOpen, RefreshCw } from "lucide-react";
import { Link, Navigate } from "react-router";
import { ApiError } from "../api/client";
import { OrderList, OrdersSkeleton } from "../components/account/OrderList";
import { ErrorState } from "../components/common/ErrorState";
import { useOrders } from "../hooks/useOrders";
import { useAuth } from "../store/AuthContext";

export function Orders() {
  const { isAuthenticated, isLoading, token, currentUser, logout, sessionScope } = useAuth();
  const orders = useOrders(token, currentUser?.id, sessionScope);
  const sessionExpired =
    orders.error instanceof ApiError && orders.error.status === 401;

  if (!isLoading && !isAuthenticated) {
    return <Navigate to="/login?returnTo=/my-account/orders" replace />;
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <Link
        to="/my-account"
        className="inline-flex items-center gap-2 text-sm font-bold text-moss hover:underline"
      >
        <ArrowLeft size={16} aria-hidden="true" /> My account
      </Link>
      <div className="mt-7 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-clay">
            Customer account
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold sm:text-5xl">
            My orders
          </h1>
          <p className="mt-3 text-ink/65">
            Your recent purchases, all in one place.
          </p>
        </div>
        {!isLoading && !sessionExpired && (
          <button
            type="button"
            disabled={orders.isFetching}
            onClick={() => void orders.refetch()}
            className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-5 py-3 text-sm font-bold hover:bg-white disabled:cursor-wait disabled:opacity-50"
          >
            <RefreshCw size={16} aria-hidden="true" />
            {orders.isFetching ? "Refreshing..." : "Refresh orders"}
          </button>
        )}
      </div>

      <section
        className="mt-8"
        aria-label="Order history"
        aria-busy={isLoading || orders.isFetching}
      >
        {isLoading || orders.isPending ? (
          <OrdersSkeleton />
        ) : sessionExpired ? (
          <div
            role="alert"
            className="rounded-2xl border border-ink/10 bg-white p-8 text-center"
          >
            <h2 className="font-display text-2xl font-bold">
              Please sign in again
            </h2>
            <p className="mt-3 text-ink/65">
              Your session has expired. Sign in to view your orders securely.
            </p>
            <button
              type="button"
              onClick={() => void logout()}
              className="mt-6 rounded-full bg-moss px-6 py-3 text-sm font-bold text-white hover:bg-ink"
            >
              Sign in again
            </button>
          </div>
        ) : orders.isError ? (
          <ErrorState
            title="Orders unavailable"
            message="We couldn't load your orders. Please try again."
            onRetry={() => void orders.refetch()}
          />
        ) : orders.data.length > 0 ? (
          <>
            <p className="mb-4 text-sm text-ink/65" role="status">
              {orders.data.length} recent{" "}
              {orders.data.length === 1 ? "order" : "orders"} · Newest first
            </p>
            <OrderList orders={orders.data} />
            {orders.data.length >= 50 && (
              <p className="mt-4 text-sm text-ink/65">
                Showing your latest 50 orders.
              </p>
            )}
          </>
        ) : (
          <div className="rounded-3xl border border-ink/10 bg-white px-6 py-16 text-center">
            <PackageOpen
              size={40}
              className="mx-auto text-moss"
              aria-hidden="true"
            />
            <h2 className="mt-5 font-display text-3xl font-bold">
              No orders yet
            </h2>
            <p className="mx-auto mt-3 max-w-sm text-ink/65">
              Once you place an order with this account, it will appear here.
            </p>
            <Link
              to="/products"
              className="mt-7 inline-block rounded-full bg-moss px-7 py-3 text-sm font-bold text-white hover:bg-ink"
            >
              Explore the shop
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
