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

React's login endpoint returns a bearer token; it does not create a WordPress browser session. The existing top-level authentication handoff to WordPress sets WordPress's own HttpOnly login cookies. React now sends a validated absolute `return_to` URL so the bridge can return to the intended account route rather than its home-page fallback.

The installed bridge is now configured with `FRONTEND_ORIGIN = 'http://alahly.test:5173'`. Open Vite at that address for a shared cart and a permitted authentication handoff. The bridge requires POST from that exact Origin, validates the return URL's scheme/host/port, runs the normal WordPress login hook, and returns a 303 redirect. Requests from localhost are rejected by this origin policy. The project copy of that plugin was removed; its live source remains in the WordPress installation.

Login can still establish a WordPress session when React runs on localhost: the browser submits the handoff directly to the WordPress origin. However, the cookie-backed React cart on localhost cannot share the WordPress cart cookie. Keep cart and hosted checkout on the same host for cart preservation. Ports 5173 and 80 are different origins, but cookies are scoped by host and path rather than by port; the existing Vite API forwarding supplies same-origin browser requests during development.

See [customer login verification](docs/customer-login.md) for the observed requests, WordPress configuration and browser acceptance checks.

## Sign up

Customers can open `/signup` or choose **Create an account** on the sign-in page. Sign-in and sign-up links preserve the requested return destination. Successful registration uses the existing WordPress authentication handoff to establish the native login cookie.

The separately installed **Alahly SPA Bridge 1.1.1** now provides `GET /wp-json/alahly-spa/v1/auth/registration` and `POST /wp-json/alahly-spa/v1/auth/register`. This WordPress-side change was applied to `C:/laragon/www/alahly/wp-content/plugins/alahly-spa-bridge/alahly-spa-bridge.php`; deploying the React build alone to another installation will not add those endpoints.

Duplicate emails and usernames return an explicit conflict message (HTTP 409). Existing customers can sign in or follow the password-reset link to WordPress's native recovery form. Opening the form does not send an email until the customer submits it.

The form follows **WooCommerce → Settings → Accounts & Privacy**. On this installation, automatic password generation is disabled (`woocommerce_registration_generate_password=no`), so signup requires a 12–128 character password and confirmation. Registration must be enabled on My Account; usernames remain automatically generated. The **Forgot your password?** link opens WordPress's native email-reset flow. Configure working WordPress email delivery for recovery links. Keep automatic password generation disabled on other installations to retain password fields at signup.

Registration uses `wc_create_new_customer`, retains WooCommerce validation and automatic-login hooks, and accepts only explicit customer fields. It rejects other browser origins and non-JSON requests and applies a basic limit of five validated attempts per five minutes per server-observed IP. The local Vite proxy shares its IP across clients. Passwords are never saved to browser storage. The existing server-side customer ownership checks still control order access.

Verification covered generated and chosen passwords, duplicate/invalid inputs, disabled registration, origin checks, customer roles, registration hooks, rate limiting, and the live HTTP authentication handoff. Temporary test accounts were removed. Browser rendering and delivery of password-setup emails have not been verified.

## Customer orders

Open **Account → View my orders** or `/my-account/orders` after signing in. The page shows each order's number, date, status, and currency-aware total, with refresh, loading, empty, error, and expired-session states.

Orders come from the existing authenticated `GET /wp-json/alahly-spa/v1/orders` endpoint. WordPress determines ownership from the verified token. React validates the response and scopes its query cache by the signed-in user; customer IDs are never sent as order filters. The installed endpoint returns the latest 50 orders, not a full paginated history.

To check the flow, open the page while signed out, sign in, and confirm that it returns to orders. Repeat with a different customer and verify that the list changes. No checkout or WordPress plugin changes are required for this page.

## Validation

```powershell
npm run build
npm run lint
```
