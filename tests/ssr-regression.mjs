import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequestHandler } from 'react-router'

// Isolated fixture transport only; never changes WooCommerce or app product data.
process.env.WC_STORE_API_URL = 'http://fixture.invalid/wp-json/wc/store/v1'
process.env.WC_LOADER_TIMEOUT_MS = '100'
const build = await import('../build/server/index.js')
const handler = createRequestHandler(build, 'production')
const product = name => ({ id: name === 'alpha' ? 1 : 2, name, slug:name, prices:{price:'100',regular_price:'100',sale_price:'100'} })
const category = {id:1,name:'Fixture collection',slug:'fixture',description:'Collection',count:2,image:null}
const fixture = input => {
  const url = new URL(input)
  if (url.pathname.endsWith('/categories')) return Response.json([category])
  if (url.searchParams.get('slug') === 'missing') return Response.json([])
  return Response.json([product(url.searchParams.get('search') || 'alpha')], {headers:{'x-wp-total':'1','x-wp-totalpages':'1'}})
}
async function withFetch(replacement, action) {
  const previous = globalThis.fetch
  globalThis.fetch = replacement
  try { return await action() } finally { globalThis.fetch = previous }
}
const request = path => handler(new Request('http://store.test' + path))

test('production documents AND route-data responses protect success, private shells, and errors', async () => {
  await withFetch(async input => fixture(input), async () => {
    for (const [path, status] of [
      ['/products',200], ['/products.data',200], ['/products/missing',404], ['/products/missing.data',404],
      ['/categories/missing',404], ['/missing',404], ['/missing.data',404],
      ['/my-account',200], ['/my-account/orders.data',200], ['/cart',200], ['/login',200],
    ]) {
      const response = await request(path)
      assert.equal(response.status, status, path)
      assert.equal(response.headers.get('Cache-Control'), 'private, no-store', path)
      const body=await response.text()
      if (path==='/products') {
        const html=body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')
        assert.match(html,/alpha/)
        assert.match(html,/rel="canonical"/)
        assert.match(html,/name="description"/)
      }
    }
  })
})

test('parallel loader caches and hydration contain only their own public queries', async () => {
  const calls=[]
  await withFetch(async (url, options) => { calls.push(options); return fixture(url) }, async () => {
    const results=await Promise.all(['alpha','beta'].map(name => build.routes['routes/products'].module.loader({
      request:new Request('http://store.test/products?search='+name,{headers:{Cookie:'private_cookie_marker',Authorization:'Bearer private_token_marker'}}),
      params:{},context:{},
    })))
    for (const [index, result] of results.entries()) {
      const state=result.data.dehydratedState
      assert.equal(state.queries.find(q=>q.queryKey[0]==='products').state.data.items[0].name,index===0?'alpha':'beta')
      assert.ok(state.queries.every(q=>q.meta.public===true))
      assert.ok(!JSON.stringify(state).includes('private_'))
    }
    assert.ok(calls.every(options=>options.credentials==='omit'&&!new Headers(options.headers).has('Cookie')&&!new Headers(options.headers).has('Authorization')))
  })
})

test('upstream failure does not leak details or retry loader requests', async () => {
  let calls=0
  await withFetch(async () => {calls++;throw new Error('private_internal_marker')}, async () => {
    const response=await request('/products')
    assert.equal(response.status,503)
    assert.equal(response.headers.get('Cache-Control'),'private, no-store')
    assert.ok(!(await response.text()).includes('private_internal_marker'))
    assert.equal(calls,2, 'one products request and one categories request; no retries')
  })
})

test('a single deadline bounds sequential category/product fetches', async () => {
  await withFetch((url, options) => new Promise((resolve,reject) => {
    const timer=setTimeout(()=>resolve(fixture(url)),70)
    options.signal.addEventListener('abort',()=>{clearTimeout(timer);reject(options.signal.reason)},{once:true})
  }),async () => {
    const started=Date.now()
    const response=await request('/categories/fixture')
    assert.equal(response.status,504)
    assert.equal(response.headers.get('Cache-Control'),'private, no-store')
    await response.text()
    assert.ok(Date.now()-started<1000)
  })
})
