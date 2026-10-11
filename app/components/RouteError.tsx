import {
  isRouteErrorResponse,
  Link,
  useRevalidator,
  useRouteError,
} from "react-router";
import { ErrorState } from "../../src/components/common/ErrorState";
export function RouteError() {
  const error = useRouteError();
  const revalidator = useRevalidator();
  const missing = isRouteErrorResponse(error) && error.status === 404;
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <ErrorState
        title={missing ? "Page not found" : "Store unavailable"}
        message={
          missing
            ? "This product, collection, or page could not be found."
            : "We could not load this page. Please try again."
        }
        onRetry={missing ? undefined : () => void revalidator.revalidate()}
      />
      <Link
        to="/products"
        className="mt-6 inline-block text-sm font-bold text-moss underline"
      >
        Browse all products
      </Link>
    </main>
  );
}
