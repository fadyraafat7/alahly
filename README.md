# Alahly WooCommerce storefront

The React storefront uses the WooCommerce Store API for products and cart activity. Customer authentication and customer-order access are supplied by the included WordPress plugin.

## Local development

```powershell
npm install
npm run dev
```

The Vite development server runs on `http://localhost:5173` and forwards `/wp-json` to `http://alahly.test`.

## Install the WordPress bridge

1. Copy [wordpress-plugin/alahly-spa-bridge](wordpress-plugin/alahly-spa-bridge) into `wp-content/plugins/` on `alahly.test`.
2. Activate **Alahly SPA Bridge** in WordPress Admin → Plugins.
3. In WooCommerce → Settings → Advanced, create and assign a **Checkout** page that resolves at `http://alahly.test/checkout/`.
4. Keep the frontend origin as `http://localhost:5173`, or update `FRONTEND_ORIGIN` in the plugin before using a different origin.

The plugin uses an exact allowed origin; it does not enable wildcard credentialed CORS.

## Checkout behavior

The cart's **Proceed to checkout** control is a normal browser link to the WooCommerce-hosted checkout page: `http://alahly.test/checkout/`. It does not call the React `/checkout` route, post to `wp-admin/admin-post.php`, or submit a cart token.

The Store API cart uses a Cart Token stored in browser session storage, while classic WooCommerce checkout normally reads its own WooCommerce session cookie. If the checkout page shows an empty cart, this is a Store API/classic WooCommerce session boundary that must be resolved in WooCommerce itself; this application deliberately does not bridge the cart token or use an insecure workaround.

## Authentication

- Login validates the password only in WordPress. The plugin returns a short-lived, server-signed token stored in browser session storage, then performs a top-level handoff to create the normal WordPress login cookie for WooCommerce.
- `/orders` uses that server-validated identity. The browser never supplies a customer ID, so it cannot request another customer's orders.

For production, use HTTPS. The WordPress plugin must use the deployed frontend’s exact origin, and the checkout page must be configured in WooCommerce.

## Validation

```powershell
npm run build
npm run lint
```