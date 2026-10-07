# Alahly WooCommerce storefront

The React storefront uses WooCommerce Store API for product and cookie-backed cart activity. Checkout remains hosted by WooCommerce.

## Same-origin cart and checkout

The React app and WordPress must use the same site host in production: `http://alahly.test` for this local setup (and the same HTTPS production hostname after deployment). This allows WooCommerce’s customer-session cookie to be used by both the React Store API cart and `/checkout/`.

The cart client sends Store API nonces for write requests and does not store or send Cart Tokens. The browser sends WooCommerce’s HTTP-only session cookie automatically with same-origin requests.

## Local development

```powershell
npm install
npm run dev
```

Open the app at **`http://alahly.test:5173`**, not `http://localhost:5173`. Vite forwards `/wp-json` to WordPress and, because the browser host is `alahly.test`, the WooCommerce session cookie can be shared with the checkout page at `http://alahly.test/checkout/`.

After switching from the old token-based cart, clear this obsolete session-storage key once in browser DevTools if it exists:

```js
sessionStorage.removeItem('alahly-store-cart-token')
```

## Checkout behavior

**Proceed to checkout** performs a normal browser navigation to `http://alahly.test/checkout/`. No custom checkout, Cart Token handoff, `admin-post.php` checkout post, or frontend WooCommerce credentials are used.

Configure a WooCommerce checkout page at that URL in WooCommerce → Settings → Advanced.

## Authentication

Customer login and order lookup require the separately installed and activated **Alahly SPA Bridge** WordPress plugin. Its REST endpoint derives the order customer ID from the server-verified user token; the browser never supplies a customer ID.

## Validation

```powershell
npm run build
npm run lint
```