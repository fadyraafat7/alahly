import assert from 'node:assert/strict'
try { process.loadEnvFile('.env') } catch { /* Environment can be supplied by deployment. */ }
const base = process.env.SSR_TEST_URL || 'http://127.0.0.1:4173'
const api = process.env.WC_STORE_API_URL || new URL(process.env.VITE_WC_STORE_API_URL || '/wp-json/wc/store/v1', process.env.VITE_WP_SITE_URL).href
const escape = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#x27;')
async function check(path, expected = 200) {
  const response = await fetch(base + path)
  const html = await response.text()
  assert.equal(response.status, expected, path)
  assert.ok(html.includes('<title>'), path + ': title missing')
  assert.ok(!html.includes('sessionStorage is not defined'), path)
  assert.ok(!html.includes('window is not defined'), path)
  console.log(`PASS ${response.status} ${path}`)
  // Exclude serialized loader data so only actual rendered markup counts as SSR.
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
}
const productsResponse = await fetch(api + '/products?per_page=12&orderby=date&order=desc')
assert.ok(productsResponse.ok, 'WordPress products unavailable')
const products = await productsResponse.json()
assert.ok(products.length, 'At least one real WooCommerce product is required')
const product = products[0]
const home = await check('/')
assert.ok(home.includes('Featured finds'))
assert.match(home, /href="\/products\/[^"?]+"/)
const listing = await check('/products')
assert.ok(listing.includes(escape(product.name)), 'Product not present in server-rendered listing')
assert.match(listing, /name="description"/)
assert.match(listing, /rel="canonical"/)
const details = await check('/products/' + product.slug)
assert.ok(details.includes(escape(product.name)), 'Product title not rendered on server')
assert.ok(details.includes('<h1'), 'Product heading missing')
await check('/products?page=2')
await check('/products?orderby=title&min_price=0')
const search = await check('/products?search=' + encodeURIComponent(product.name))
assert.ok(search.includes(escape(product.name)))
const empty = await check('/products?search=alahly_no_result_8b38b977')
assert.ok(empty.includes('No products found'))
const categoriesResponse = await fetch(api + '/products/categories?per_page=100')
const categories = await categoriesResponse.json()
const category = categories.find((item) => item.count > 0)
assert.ok(category, 'At least one populated category is required')
const collection = await check('/categories/' + category.slug)
assert.ok(collection.includes(escape(category.name)))
await check('/categories/' + category.slug + '?orderby=title')
await check('/products/alahly-missing-8b38b977', 404)
await check('/categories/alahly-missing-8b38b977', 404)
await check('/alahly-missing-8b38b977', 404)
for (const path of ['/login','/signup','/my-account','/my-account/orders','/cart','/checkout']) {
  const html = await check(path)
  assert.ok(html.includes('noindex,nofollow'), path + ': private page indexing')
}
console.log('SSR smoke checks passed; browser hydration and authenticated flows require separate testing.')
