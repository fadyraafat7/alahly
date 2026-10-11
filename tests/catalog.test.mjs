import test from 'node:test'
import assert from 'node:assert/strict'
import { catalogParams, categoryParams } from '../src/utils/catalogParams.ts'
import { safeHtml } from '../src/utils/html.ts'

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
