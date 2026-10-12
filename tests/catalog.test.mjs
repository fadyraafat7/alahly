import test from 'node:test'
import assert from 'node:assert/strict'
import { catalogParams, categoryParams, normalizeProductQuery } from '../src/utils/catalogParams.ts'
import { catalogPolicy, categoryPolicy, retryCatalog } from '../src/query/policy.ts'
import { hashKey } from '@tanstack/query-core'
import { safeHtml } from '../src/utils/html.ts'
import { readFile } from 'node:fs/promises'

test('product details use valid Unicode punctuation without corrupting existing valid copy', async () => {
  const read = file=>readFile(new URL('../'+file,import.meta.url),'utf8')
  const details = await read('src/pages/ProductDetails.tsx')
  assert.ok(details.includes('Loading available options…'))
  assert.ok(details.includes('product.sku || "—"'))
  assert.ok(!details.includes('â€¦') && !details.includes('â€”'))
  assert.ok((await read('src/pages/SignUp.tsx')).includes('Use 12–128 characters.'))
  assert.ok((await read('src/pages/Orders.tsx')).includes('· Newest first'))
})

test('catalog URLs normalize invalid inputs consistently for loaders and hooks', () => {
  const params = catalogParams(new URLSearchParams('page=-3&category=x&min_price=0&max_price=NaN&orderby=unknown&on_sale=true'))
  assert.equal(params.page, 1)
  assert.equal(params.category, undefined)
  assert.equal(params.min_price, 0)
  assert.equal(params.max_price, undefined)
  assert.equal(params.orderby, 'date')
  assert.equal(params.on_sale, true)
  assert.deepEqual(categoryParams(new URLSearchParams('page=2&orderby=title'), 8), { category: 8, page: 2, per_page: 12, orderby: 'title', order: 'asc' })
})

test('WordPress markup remains readable without executing injected HTML', () => {
  const html = safeHtml('<p class="copy">Details <strong>here</strong></p><script>alert(1)</script><img src="https://example.test/a.jpg" onerror="alert(1)"><a href="javascript:alert(1)">bad</a>')
  assert.ok(html.includes('<strong>here</strong>'))
  assert.ok(html.includes('https://example.test/a.jpg'))
  assert.ok(!/script|onerror|javascript:/.test(html))
})

test('equivalent query inputs have identical keys and request parameters', () => {
  const a = normalizeProductQuery()
  const b = normalizeProductQuery({ search: '  ', page: 1, per_page: 10, orderby: 'date', order: 'desc' })
  assert.deepEqual(a, b)
  assert.equal(hashKey(['products', a]), hashKey(['products', b]))
  assert.equal(normalizeProductQuery({ per_page: 1000 }).per_page, 100)
  assert.equal(normalizeProductQuery({ min_price: 1.234 }).min_price, 1.23)
  for (const params of [{page:2}, {search:'bag'}, {category:2}, {min_price:1}, {max_price:2}, {on_sale:true}, {featured:true}, {related:8}, {parent:3,type:'variation'}, {per_page:4}, {orderby:'price'}]) {
    assert.notEqual(hashKey(['products', a]), hashKey(['products', normalizeProductQuery(params)]))
  }
})

test('low-to-high price sort uses asc in both catalog and category URLs', () => {
  const params = new URLSearchParams('orderby=price')
  assert.equal(catalogParams(params).order, 'asc')
  assert.equal(categoryParams(params, 5).order, 'asc')
  assert.equal(normalizeProductQuery({orderby:'price'}).order, 'asc')
})

test('catalog policy permits fresh hydration and visible price refresh without retrying 4xx', () => {
  assert.equal(catalogPolicy.staleTime, 60_000)
  assert.equal(catalogPolicy.refetchInterval, 60_000)
  assert.equal(catalogPolicy.refetchIntervalInBackground, false)
  assert.equal(catalogPolicy.refetchOnWindowFocus, true)
  assert.equal(categoryPolicy.staleTime, 300_000)
  assert.equal(categoryPolicy.refetchInterval, false)
  assert.equal(retryCatalog(0, Object.assign(new Error(), {status:400})), false)
  assert.equal(retryCatalog(0, Object.assign(new Error(), {status:503})), true)
  assert.equal(retryCatalog(1, new Error()), false)
})
