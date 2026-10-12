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
- Titles, descriptions, canonical links, and robots metadata come from route modules. Missing products/categories return HTTP 404; upstream failures return 503 and the loader deadline returns 504.
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
npm run test:ssr:regression
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

Smoke tests use real WooCommerce products and check rendered HTML after removing script blocks. They require populated product/category data and at least two product pages. `npm test` covers parameters, sanitization, private-cache races, timeouts, cart coordination, and configuration without contacting WordPress. `npm run test:ssr:regression` requires a current production build and tests its actual request handler against in-memory Store API fixtures; fixture products never enter application source or WordPress.

On memory-constrained Windows systems, set `$env:RAYON_NUM_THREADS = '2'` before building. Do not run two development servers against the same Vite dependency cache. React Router v7 currently prints Vite envFile deprecation and v8 future-flag notices; these are upstream tooling notices, not failed builds.

Vite asset manifests are explicitly retained for deployment. This also avoids the observed Windows `EBUSY` failure when React Router deletes newly emptied `.vite` directories after an otherwise successful build. No dependency code or security checks were patched.

## Environment

See `.env.example`. Every `VITE_*` value is public and embedded during the client build:

| Variable | Purpose |
| --- | --- |
| `VITE_WC_STORE_API_URL` | Browser Store API path, normally `/wp-json/wc/store/v1`. |
| `VITE_WP_AUTH_API_URL` | Browser bridge API path, normally `/wp-json/alahly-spa/v1`. |
| `VITE_WP_SITE_URL` | WordPress origin for native authentication, recovery, and checkout. |
| `WC_STORE_API_URL` | Optional server-only absolute Store API override. Defaults to the configured browser API path resolved against the WordPress origin. |
| `STOREFRONT_URL` | Server-side canonical storefront origin; defaults to the WordPress origin. |
| `WC_LOADER_TIMEOUT_MS` | Server-only deadline across the entire loader, default 10000 ms, allowed range 100-30000. |
| `HOST`, `PORT` | Production Node listener address and port. |

Vite reads `.env` in development/build. Set server-only values in the production process environment; `react-router-serve` does not automatically load this project's `.env`. No WooCommerce Consumer Key or Secret is needed for public catalog SSR.

The server validates configuration when its bundle loads. URLs must use HTTP(S) and exclude credentials, query strings, and fragments. Runtime `VITE_*` overrides that disagree with the client build are rejected: rebuild when changing the public store. An explicit `WC_STORE_API_URL` can use an internal hostname, but operators must ensure it points to the same WooCommerce installation as the browser.

## Production deployment

SSR requires a running Node service. Uploading only static files to WordPress hosting is insufficient.

Run the generated server behind the site's web server with the storefront and WordPress on the same public hostname. Route storefront pages and assets to Node, while preserving WordPress ownership of:

- `/wp-json/`
- `/wp-admin/`, `/wp-login.php`
- `/wp-content/`, `/wp-includes/`
- `/checkout/` and its endpoints
- Native WooCommerce recovery endpoints, if used

Use deliberate route ownership: React's `/my-account` is the storefront account dashboard. Do not send all WordPress paths to React or replace every route with a static index.html fallback. Existing development forwarding is not included in the standalone production server. Therefore running Node at localhost:4173 alone verifies public SSR, but does not configure shared-cookie production authentication/cart APIs.

Preserve Origin, Host, normal Set-Cookie behavior, and HTTPS through the web-server configuration. Update the separately installed bridge's permitted frontend origin for the real production origin. Do not copy cookies or expose bearer tokens in URLs. Do not override private/no-store response headers with shared-cache rules. Web-server configuration is unchanged; the bridge-only header change is documented below.

## Authentication, signup, cart, and checkout

The separately installed **Alahly SPA Bridge 1.1.2** remains at `C:/laragon/www/alahly/wp-content/plugins/alahly-spa-bridge/alahly-spa-bridge.php`. Its source is managed outside this React repository.

- Login returns a short-lived bearer token. The existing top-level form handoff to WordPress establishes WordPress's HttpOnly login cookies. It validates the return destination and preserves the intended account route.
- Signup uses the registration settings endpoint and WooCommerce customer creation. Automatic password generation is disabled locally, so signup requires a matching 12–128 character password. Passwords are not stored in browser storage.
- Duplicate account details show a conflict message. Password recovery remains WordPress-hosted and needs working WordPress email delivery.
- Orders use the token-derived customer identity on the server, never a customer ID from the browser. Query caches remain scoped by customer and are removed when accounts change.
- Store API cart mutations use nonces and the browser's cookie session; no Cart Tokens or locally reconstructed carts are introduced.
- Checkout remains a normal navigation to the configured WordPress `/checkout/`. Authentication handoff is separate from checkout.

## Cache and lifecycle policy

Implementation map (all changes are scoped to this hardening):

| Files | Purpose |
| --- | --- |
| `app/entry.server.tsx`, `app/lib/cachePolicy.ts` | Apply the same no-store policy to HTML and route-data responses |
| `src/store/AuthContext.tsx`, `src/query/privateSession.ts`, `src/hooks/useOrders.ts`, `src/pages/Orders.tsx` | Session-scoped private queries, cancellation, cleanup, and stale-login rejection |
| `src/api/auth.ts`, `src/utils/requestSignal.ts` | Bounded auth requests and logout revocation |
| `src/utils/catalogParams.ts`, `src/query/catalog.ts`, `src/query/client.ts`, `src/query/policy.ts`, `src/api/products.ts` | Normalized keys/requests, price ordering, freshness, retries, and SSR GC safety |
| `src/store/CartContext.tsx`, `src/store/cartCoordinator.ts`, `src/api/cart.ts`, `src/api/client.ts` | Cart lifecycle, read cancellation, guarded writes, and private fetches |
| `src/components/cart/CartFeedback.tsx`, `CartDrawer.tsx`, `CartItem.tsx`, `CartSummary.tsx`; `src/pages/Cart.tsx`, `Checkout.tsx`; `src/components/product/ProductCard.tsx`, `src/pages/ProductDetails.tsx` | Error/retry states and cart/checkout interaction guards |
| `app/lib/catalog.server.ts`, `app/lib/config.server.ts`, `app/lib/serverConfig.ts`, `vite.config.ts`, `.env.example` | Validated configuration, public-only dehydration, and whole-loader deadlines |
| `tests/catalog.test.mjs`, `session-cache.test.mjs`, `cart-config.test.mjs`, `api.test.mjs`, `ssr-regression.mjs`, `ssr-smoke.mjs`, `bridge-cache.php`, `live-auth.mjs`, `live-cart.ps1`; `package.json`, `README.md` | Repeatable automated/live checks, scripts, and deployment notes |

| Layer/data | Freshness and lifetime | Refresh / invalidation |
| --- | --- | --- |
| HTML and React Router route data | `private, no-store`, including errors | Every request; no shared HTTP cache |
| SSR public QueryClients | Request-local; no GC timers retaining request state | Loader clears its cache; only successful queries explicitly marked public are dehydrated |
| Browser products/details/variations | 60-second stale time; five-minute inactive GC | Stale mount/focus/reconnect; 60-second visible-tab refresh; fresh hydration avoids an immediate refetch |
| Browser categories | Five-minute stale time; ten-minute inactive GC | Stale mount/focus/reconnect; no polling |
| Profile/orders | Session-scoped keys without tokens; zero stale time and inactive GC | Cancel/remove on session changes or protected-request 401; orders refetch on mount/focus, profile also checks every visible minute |
| Cart | WooCommerce cookie session; no-store HTTP requests | Read on mount; account changes clear displayed cart until native handoff reload or explicit refresh; uncertain writes require explicit read reconciliation |
| Bridge authentication/orders | `private, no-store` for namespace successes and errors | Server authorization on every protected request |
| Node shared cache, Redis, CDN, persistent query cache | Not introduced | Production cache infrastructure remains an operator responsibility |

Public query parameters are normalized before both key construction and API requests. Price low-to-high uses ascending order. Browser catalog reads retry at most once for network/429/5xx errors; SSR reads do not retry and share one whole-loader deadline.

Auth requests are bounded to ten seconds; remote logout revocation is bounded to three seconds. Logout immediately removes local private state before waiting for revocation and preserves the existing native WordPress logout handoff. A failed revocation cannot prove server logout occurred; WordPress must be reachable to clear its own cookie session.

Cart writes are guarded against overlap, never automatically replayed. Failed reads are not treated as empty carts. Checkout links/routes remain unavailable until the cart is known, non-empty, and settled. Native WooCommerce remains authoritative for totals, stock, and final checkout.

## WordPress change outside this repository

The installed bridge was inspected and changed only as follows: version 1.1.1 to 1.1.2, one `rest_post_dispatch` filter in `init()`, and this callback. Existing authentication, CORS, order authorization, and handoff logic were not changed.

```php
add_filter( 'rest_post_dispatch', array( __CLASS__, 'private_response' ), 20, 3 );

public static function private_response( $response, $server, $request ) {
    $route = $request->get_route();
    if ( '/' . self::NAMESPACE === $route || 0 === strpos( $route, '/' . self::NAMESPACE . '/' ) ) {
        $response->header( 'Cache-Control', 'private, no-store' );
    }
    return $response;
}
```

Deploy this small change to the separately managed plugin as well as the React build. Do not replace the full installed plugin with this snippet. Run `php -l <bridge-file>` and `php tests/bridge-cache.php <bridge-file>`; the standalone test checks success/error statuses and namespace isolation without loading WordPress.

## Verification and remaining browser checks

The follow-up code-review fixes are scoped to these files:

| Files | Root cause and correction |
| --- | --- |
| `src/store/AuthContext.tsx`, `src/pages/Orders.tsx`, `src/components/layout/Header.tsx`, `src/pages/MyAccount.tsx`, `src/api/auth.ts` | Orders called only React logout, and automatic 401 cleanup removed the error before its expiry action could reliably render. Authentication now retains a non-sensitive expiry flag; every explicit logout clears local state, attempts bounded token revocation, and submits the same native WordPress logout handoff once. |
| `src/pages/ProductDetails.tsx` | Two source strings actually contained mojibake. Restored their ellipsis and em dash. Other strings flagged in the review were valid UTF-8 displayed incorrectly by PowerShell and were left unchanged. |
| `src/types/auth.ts`, `src/api/auth.ts` | Login/profile responses were trusted through TypeScript casts. Both now validate against shared Zod user/session schemas before returning data. |
| `src/api/client.ts`, `src/api/auth.ts` | Raw JSON parser errors and malformed error-message fields could escape to callers. A shared response reader emits safe `ApiError` messages, retains HTTP statuses such as 401, and preserves cancellation. |
| `src/api/products.ts`, `src/api/cart.ts` | Zod diagnostics escaped directly; missing cart items could default to an empty successful cart. Schema failures now become safe errors, and a successful cart response must contain its items array. |
| `tests/api.test.mjs`, `tests/catalog.test.mjs` | Added regression coverage for the Orders expiry action after cleanup, one native logout submission despite failed revocation, private-cache switching, invalid JSON/shapes, response-body cancellation, cart checkout blocking, and exact Unicode corrections. |

Follow-up verification passed: `npm run typecheck`, `npm run lint`, all 21 `npm test` tests, `npm run build`, and all four `npm run test:ssr:regression` tests. The actual updated login/profile API functions also passed against a seeded Customer on local WordPress; the temporary bearer token was revoked and its subsequent profile request returned 401. These live requests ran outside a browser and do not establish WordPress cookie clearing or customer switching. No separately installed WordPress files were modified during this follow-up.

Exact browser verification for expired sessions and customer switching remains required:

1. Start Laragon Apache/MySQL and `npm run dev`. Open a clean browser session at `http://alahly.test:5173`, enable DevTools Network **Preserve log**, and sign in as Customer A. Confirm the login handoff completes and `/my-account/orders` contains only A's orders.
2. On the Orders page, revoke only the React bearer token using this Console command. It does not copy or edit cookies:

   ```js
   await fetch('/wp-json/alahly-spa/v1/auth/logout', {
     method: 'POST',
     headers: { Authorization: `Bearer ${sessionStorage.getItem('alahly-auth-token')}` },
     cache: 'no-store',
   });
   ```

3. Click **Refresh orders**. Confirm `/orders` returns 401, React removes the stored auth token and private orders, and **Sign in again** remains visible. Click it and confirm one top-level POST to `http://alahly.test/wp-admin/admin-post.php` with `action=alahly_spa_logout`, followed by the existing bridge's 303 redirect to the storefront home page.
4. Inspect the native logout response's Set-Cookie headers and WordPress-origin cookies in DevTools Application. Open `http://alahly.test/checkout/` and verify WordPress now treats the session as a guest. A submitted form alone does not prove this; if logout fails, record its status before continuing.
5. Return to the storefront, sign in as Customer B, and verify the authentication handoff completes. Open B's Orders page, refresh it, and use Back/Forward; A's orders must not appear. Add a test product and open native checkout; confirm B's identity and the intended cart contents. Do not place an order; remove the test item afterward.
6. Repeat normal sign-out from My Account and the mobile header. If testing failed revocation, block only `/wp-json/alahly-spa/v1/auth/logout` in DevTools; leave WordPress's `admin-post.php` reachable. Native logout should still be submitted. Full WordPress downtime cannot establish cookie clearing.

Browser verification was not executed in this follow-up. Earlier automation stopped because it could not reliably identify Chrome's current URL for its safety checks; it was not retried here. These cookie, redirect, and checkout assertions remain unverified. The unit test captures the submitted form using a test DOM and controls the Orders hooks; it does not execute WordPress logout or emulate browser cookie policy.

Executed during the cache/session hardening:

- Framework type generation, TypeScript, production build, lint, and 14 unit/API regression tests.
- Production HTML smoke checks for all routes, product content, metadata, search, pagination, category sorting, empty results, and 404s.
- Four production-bundle regression tests: HTML/data headers, concurrent public-query isolation, safe 503 errors without retries, and a shared deadline across sequential fetches (504).
- PHP syntax and bridge cache-header regression checks.
- Live HTTP tests through development forwarding: Mohamed/Omar login, profile, separate order sets, ignored customer-ID tampering, logout/revocation, and private/no-store headers.
- An isolated guest cart: add, quantity change, native checkout request, and cookie-session continuity. The added test item was removed; no order was placed.

WordPress initially refused/timed out, then became available for the live HTTP tests. Browser automation was stopped because it could not reliably determine Chrome's current URL for its safety checks. No live browser test is claimed. Hydration, CORS/SameSite behavior, UI account switching, click-driven cart/checkout, visual parity, and duplicate hydration requests remain unverified. Signup/password recovery were not re-executed in this hardening pass; email delivery and browser LCP/CLS remain unmeasured.

Repeat live HTTP checks with the development server and WordPress running:

```powershell
# Supply test-only credentials in this terminal; do not commit them or put them in VITE variables.
$env:ALAHLY_TEST_CUSTOMER_A_EMAIL = '<customer-a>'
$env:ALAHLY_TEST_CUSTOMER_B_EMAIL = '<customer-b>'
$env:ALAHLY_TEST_PASSWORD = '<shared-test-password>'
node tests/live-auth.mjs
powershell -NoProfile -File tests/live-cart.ps1
```

The cart test uses a new automatic cookie container, refuses a non-empty initial cart, adds/removes only its own test item, and does not place an order. These are HTTP tests, not substitutes for the browser checklist.

Complete these browser checks at **http://alahly.test:5173**:

1. Open Products with DevTools Console/Network. Check that the initial document contains product cards, hydration has no errors, and the same initial product/category queries are not immediately repeated.
2. Change search, filters, sorting, and pages; use Back/Forward and refresh category/product URLs.
3. Check desktop/mobile styling and product gallery/options.
4. In separate clean sessions, sign in as two Customers; check each account/orders page, refresh, and sign out. Verify no previous account's cached orders appear.
5. Add a product, change quantity, refresh, and proceed to WordPress checkout. Confirm customer identity and cart contents.
6. Test password signup and password recovery with a deliverable email address; do not place an order merely to test navigation.
