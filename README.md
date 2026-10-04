# Alahly WooCommerce Storefront

A React, TypeScript and Vite storefront for WooCommerce. It obtains catalog data through a backend proxy; browser code never contains WooCommerce consumer credentials.

## Run locally

1. Copy `.env.example` to `.env`. The default `/api` path is proxied to the local server by Vite.
2. Copy `.env.backend.example` to `.env.backend`, then set the server-only WooCommerce credentials.
3. Run `npm install`.
4. Run `npm run dev:full`.

Run `npm run build` for a production build and `npm run lint` for linting.

`npm run server` starts only the secure proxy at `http://localhost:5000/api`; its health check is available at `/api/health`.

## Proxy contract

The frontend requests these public proxy endpoints:

- `GET /products` — accepts WooCommerce-style parameters such as `search`, `category`, `min_price`, `max_price`, `orderby`, `order`, `page`, `per_page`, `on_sale`, `featured`, and `include`.
- `GET /products/:id/variations`
- `GET /products/categories`

The proxy should forward these to WooCommerce REST v3 with its server-only environment values:

```env
WC_API_URL=https://www.ahlymedical.com/wp-json/wc/v3
WC_CONSUMER_KEY=your_consumer_key
WC_CONSUMER_SECRET=your_consumer_secret
```

For product pagination, forward WooCommerce's `X-WP-Total` and `X-WP-TotalPages` response headers. Alternatively, return `{ "items": [...], "total": 0, "totalPages": 0 }`.

## Checkout

The cart is stored in `localStorage`. The checkout screen deliberately defers payments, taxes, shipping and order creation to a secure backend/WooCommerce checkout endpoint. Connect the proxy to a WooCommerce-compatible checkout flow and redirect the customer to the hosted URL; never add `WC_CONSUMER_SECRET` to the Vite environment.
