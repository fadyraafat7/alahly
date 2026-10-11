import { useState, type ReactNode } from "react";
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "../src/query/client";
import { AuthProvider } from "../src/store/AuthContext";
import { CartProvider } from "../src/store/CartContext";
import { Layout as StoreLayout } from "../src/components/layout/Layout";
import { CartDrawer } from "../src/components/cart/CartDrawer";
import "../src/index.css";
export { RouteError as ErrorBoundary } from "./components/RouteError";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
export default function Root() {
  // Never share a QueryClient between server requests.
  const [client] = useState(createQueryClient);
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <CartProvider>
          <StoreLayout>
            <Outlet />
          </StoreLayout>
          <CartDrawer />
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
