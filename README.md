# Alahly WooCommerce storefront

React Router **7.18.4 Framework Mode** provides SSR with Vite, React, TypeScript, Tailwind, and TanStack Query. The existing storefront components remain in `src/`; framework entry points and route modules live in `app/`.

## Development

Use Node 22.17+ and npm:

```powershell
npm install
npm run dev
```

Open **http://alahly.test:5173**. WordPress must be running at the configured `VITE_WP_SITE_URL`. The existing WordPress bridge accepts the exact origin `http://alahly.test:5173`; localhost is not interchangeable. Ports differ, but cookies share the `alahly.test` host. Vite forwards browser `/wp-json` requests to WordPress.

## Rendering and data ownership

- Home, product listings, categories, and product details load public Store API data on the server.
- Route loaders create a fresh QueryClient per request, fetch using shared query definitions, and return a dehydrated public cache through React Router loader data. Existing hooks consume that cache through HydrationBoundary; fresh initial data does not need a second browser fetch.
- Search, filters, pagination, and sorting use URL parameters. Category pagination and sorting now survive refresh.
- Titles, descriptions, canonical links, and robots metadata come from route modules. Missing products/categories return HTTP 404; upstream failures return a 503 error page.
- HTML descriptions use the same sanitization policy in Node and the browser.
- Auth/session state, customer orders, registration actions, and cookie-backed cart operations remain client-side. The server renders loading states instead of pretending to know the current customer or cart.
- No customer cookies, cart nonces, or bearer tokens are forwarded by public loaders or included in their hydration data. Server QueryClients are never shared between requests.

## Commands

```powershell
npm run dev
npm run typecheck
npm run build
npm run lint
npm test
npm start
```

The scripts run `react-router dev`, `react-router typegen && tsc -b`, `react-router build`, and `react-router-serve build/server/index.js`. `npm run preview` also runs the production server. Build output is `build/client` plus `build/server`, not the old static `dist`.

For an isolated production smoke test:

```powershell
$env:HOST = '127.0.0.1'
$env:PORT = '4173'
npm start
```

Then, in another terminal:

```powershell
$env:SSR_TEST_URL = 'http://127.0.0.1:4173'
npm run test:ssr
```

Smoke tests use real WooCommerce products and check rendered HTML after removing script blocks. They require populated product/category data and at least two product pages. `npm test` checks URL parsing and HTML sanitization without contacting WordPress.

On memory-constrained Windows systems, set `$env:RAYON_NUM_THREADS = '2'` before building. Do not run two development servers against the same Vite dependency cache. React Router v7 currently prints Vite envFile deprecation and v8 future-flag notices; these are upstream tooling notices, not failed builds.

## Environment

See `.env.example`. Every `VITE_*` value is public and embedded during the client build:

| Variable | Purpose |
| --- | --- |
| `VITE_WC_STORE_API_URL` | Browser Store API path, normally `/wp-json/wc/store/v1`. |
| `VITE_WP_AUTH_API_URL` | Browser bridge API path, normally `/wp-json/alahly-spa/v1`. |
| `VITE_WP_SITE_URL` | WordPress origin for native authentication, recovery, and checkout. |
| `WC_STORE_API_URL` | Optional server-only absolute Store API override. Defaults to the configured browser API path resolved against the WordPress origin. |
| `STOREFRONT_URL` | Server-side canonical storefront origin; defaults to the WordPress origin. |
| `HOST`, `PORT` | Production Node listener address and port. |

Vite reads `.env` in development/build. Set server-only values in the production process environment; `react-router-serve` does not automatically load this project's `.env`. No WooCommerce Consumer Key or Secret is needed for public catalog SSR.

## Production deployment

SSR requires a running Node service. Uploading only static files to WordPress hosting is insufficient.

Run the generated server behind the site's web server with the storefront and WordPress on the same public hostname. Route storefront pages and assets to Node, while preserving WordPress ownership of:

- `/wp-json/`
- `/wp-admin/`, `/wp-login.php`
- `/wp-content/`, `/wp-includes/`
- `/checkout/` and its endpoints
- Native WooCommerce recovery endpoints, if used

Use deliberate route ownership: React's `/my-account` is the storefront account dashboard. Do not send all WordPress paths to React or replace every route with a static index.html fallback. Existing development forwarding is not included in the standalone production server. Therefore running Node at localhost:4173 alone verifies public SSR, but does not configure shared-cookie production authentication/cart APIs.

Preserve Origin, Host, normal Set-Cookie behavior, and HTTPS through the web-server configuration. Update the separately installed bridge's permitted frontend origin for the real production origin. Do not copy cookies or expose bearer tokens in URLs. The migration does not change web-server configuration or the installed bridge.

## Authentication, signup, cart, and checkout

The separately installed **Alahly SPA Bridge 1.1.1** remains at `C:/laragon/www/alahly/wp-content/plugins/alahly-spa-bridge/alahly-spa-bridge.php`. Its source is managed outside this React repository.

- Login returns a short-lived bearer token. The existing top-level form handoff to WordPress establishes WordPress's HttpOnly login cookies. It validates the return destination and preserves the intended account route.
- Signup uses the registration settings endpoint and WooCommerce customer creation. Automatic password generation is disabled locally, so signup requires a matching 12–128 character password. Passwords are not stored in browser storage.
- Duplicate account details show a conflict message. Password recovery remains WordPress-hosted and needs working WordPress email delivery.
- Orders use the token-derived customer identity on the server, never a customer ID from the browser. Query caches remain scoped by customer and are removed when accounts change.
- Store API cart mutations use nonces and the browser's cookie session; no Cart Tokens or locally reconstructed carts are introduced.
- Checkout remains a normal navigation to the configured WordPress `/checkout/`. Authentication handoff is separate from checkout.

## Verification and remaining browser checks

Executed for this migration:

- Framework type generation, TypeScript, production build, lint, and catalog unit tests.
- Production HTML smoke checks for all routes, product content, metadata, search, pagination, category sorting, empty results, and 404s.
- An isolated unreachable-upstream check: product page returned HTTP 503 with an error UI.
- HTTP tests through the development API forwarding: password signup/login, 303 auth handoff, authenticated native checkout, cart quantity preservation, removal, unauthenticated order denial, and separate Mohamed/Omar order sets. The completed test's temporary customer and cart item were removed.
- Native password-recovery form availability; no reset email was requested.

Browser tooling could not initialize (kernel assets path error). HTTP clients do not verify browser hydration, CORS/SameSite policy, visual parity, client navigation, or duplicate requests during hydration. Email delivery was not tested.

Complete these browser checks at **http://alahly.test:5173**:

1. Open Products with DevTools Console/Network. Check that the initial document contains product cards, hydration has no errors, and the same initial product/category queries are not immediately repeated.
2. Change search, filters, sorting, and pages; use Back/Forward and refresh category/product URLs.
3. Check desktop/mobile styling and product gallery/options.
4. In separate clean sessions, sign in as two Customers; check each account/orders page, refresh, and sign out. Verify no previous account's cached orders appear.
5. Add a product, change quantity, refresh, and proceed to WordPress checkout. Confirm customer identity and cart contents.
6. Test password signup and password recovery with a deliverable email address; do not place an order merely to test navigation.
