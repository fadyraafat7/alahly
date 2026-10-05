# Alahly WooCommerce Storefront

This React storefront uses WooCommerce’s public Store API. It does not use WooCommerce consumer keys, consumer secrets, or a catalog proxy.

## Run locally

1. Copy `.env.example` to `.env` if it is not already present.
2. Run `npm install`.
3. Run `npm run dev`.

The app requests the Store API at `/wp-json/wc/store/v1`. During development, Vite forwards that path to the configured WordPress host. Production should either serve the app from that WordPress domain or configure WordPress CORS to allow the deployed frontend origin.

## Store API endpoints

- `GET /wp-json/wc/store/v1/products`
- `GET /wp-json/wc/store/v1/products/categories`
- `GET /wp-json/wc/store/v1/cart`
- `POST /wp-json/wc/store/v1/cart/add-item`
- `POST /wp-json/wc/store/v1/cart/update-item`
- `POST /wp-json/wc/store/v1/cart/remove-item`

Cart session state is managed with the Store API’s `Cart-Token`; no WooCommerce credentials are sent to or stored in the browser.

Run `npm run build` for a production build and `npm run lint` for linting.