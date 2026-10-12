import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { QueryClient } from '@tanstack/query-core'
import { clearPrivateCache, createSessionEpoch, ordersKey, profileKey } from '../src/query/privateSession.ts'
import { createCartCoordinator } from '../src/store/cartCoordinator.ts'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'

async function withApiModules(run, plugins = []) {
  const server = await createServer({ configFile:false, plugins, appType:'custom', cacheDir:'node_modules/.cache/alahly-api-tests', optimizeDeps:{noDiscovery:true,include:[]}, server:{middlewareMode:true} })
  const globals = ['fetch', 'window', 'document', 'sessionStorage', '__alahlyTestAuth', '__alahlyTestOrders']
  const original = Object.fromEntries(globals.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
  globalThis.window = {location:{origin:'http://alahly.test:5173'}}
  const storage = new Map()
  globalThis.sessionStorage = {getItem:key=>storage.get(key) ?? null, setItem:(key,value)=>storage.set(key,value), removeItem:key=>storage.delete(key)}
  try {
    const client = await server.ssrLoadModule('/src/api/client.ts')
    const auth = await server.ssrLoadModule('/src/api/auth.ts')
    const products = await server.ssrLoadModule('/src/api/products.ts')
    const cart = await server.ssrLoadModule('/src/api/cart.ts')
    await run({server, client, auth, products, cart, storage})
  } finally {
    for (const key of globals) {
      if (original[key]) Object.defineProperty(globalThis, key, original[key])
      else delete globalThis[key]
    }
    await server.close()
  }
}

function captureForms() {
  const submitted = []
  globalThis.document = {
    body:{append() {}},
    createElement(tag) {
      if (tag === 'input') return {}
      return {fields:[], append(input) { this.fields.push(input) }, submit() { submitted.push(this) }}
    },
  }
  return submitted
}

function findElement(node, predicate) {
  if (!node || typeof node !== 'object') return undefined
  if (predicate(node)) return node
  return [node.props?.children].flat(Infinity).map(child=>findElement(child,predicate)).find(Boolean)
}

test('login and profile responses validate identity and token before entering the session', async () => {
  await withApiModules(async ({auth,client}) => {
    const user = {id:2,email:'fixture@example.test',name:'Customer B'}
    globalThis.fetch = async () => Response.json({token:'valid-test-token',user,ignored:'extra'})
    assert.deepEqual(await auth.loginCustomer('fixture','not-a-real-password'), {token:'valid-test-token',user})
    for (const payload of [null,{}, {token:'',user}, {token:3,user}, {token:'test',user:{...user,id:0}}, {token:'test',user:{...user,email:42}}]) {
      globalThis.fetch = async () => Response.json(payload)
      await assert.rejects(auth.loginCustomer('fixture','not-a-real-password'), error=>error instanceof client.ApiError && error.message === 'We could not confirm your sign-in. Please try again.')
    }
    for (const payload of [null,{}, {...user,id:-1}, {...user,id:2.5}, {...user,name:null}]) {
      globalThis.fetch = async () => Response.json(payload)
      await assert.rejects(auth.getCurrentCustomer('test-token'), error=>error instanceof client.ApiError && error.message === 'We could not read your account. Please try again.')
    }
    globalThis.fetch = async () => Response.json(user)
    assert.deepEqual(await auth.getCurrentCustomer('test-token'), user)
  })
})

test('malformed auth and Store JSON returns safe ApiErrors and preserves HTTP denial statuses', async () => {
  await withApiModules(async ({auth,client}) => {
    const calls = [()=>auth.loginCustomer('fixture','test'), ()=>auth.getCurrentCustomer('test'), ()=>client.apiGet('/products')]
    for (const call of calls) {
      for (const text of ['<html>PRIVATE DIAGNOSTIC</html>', '{broken', '']) {
        globalThis.fetch = async () => new Response(text)
        await assert.rejects(call(), error=>error instanceof client.ApiError && !/PRIVATE|JSON|SyntaxError|broken/.test(error.message))
      }
      for (const status of [401,403,503]) {
        globalThis.fetch = async () => new Response('<html>PRIVATE DIAGNOSTIC</html>', {status})
        await assert.rejects(call(), error=>error instanceof client.ApiError && error.status === status && !/PRIVATE|JSON|SyntaxError/.test(error.message))
      }
      globalThis.fetch = async () => Response.json({message:{private:'diagnostic'}}, {status:401})
      await assert.rejects(call(), error=>error instanceof client.ApiError && error.status === 401 && !error.message.includes('[object Object]'))
    }
    globalThis.fetch = async () => Response.json({message:'Invalid username or password.'}, {status:401})
    await assert.rejects(auth.loginCustomer('fixture','test'), error=>error instanceof client.ApiError && error.status === 401 && error.message === 'Invalid username or password.')
  })
})

test('body cancellation stays cancellable after successful response headers', async () => {
  await withApiModules(async ({auth,client}) => {
    for (const call of [signal=>auth.getCurrentCustomer('test',signal), signal=>client.apiGet('/products',undefined,{signal})]) {
      const controller = new AbortController()
      let startBody
      const bodyStarted = new Promise(resolve=>{ startBody=resolve })
      globalThis.fetch = async (_url, options) => ({ok:true,status:200,headers:new Headers(), json:()=>new Promise((_,reject)=>{
        options.signal.addEventListener('abort',()=>reject(options.signal.reason),{once:true})
        startBody()
      })})
      const pending = call(controller.signal)
      await bodyStarted
      controller.abort()
      await assert.rejects(pending,{name:'AbortError'})
    }
  })
})

test('product/cart schema failures are safe and an invalid cart cannot enable checkout', async () => {
  await withApiModules(async ({products,cart,client}) => {
    for (const payload of [{},null,[{id:1,name:'PRIVATE DIAGNOSTIC'}]]) {
      globalThis.fetch = async () => Response.json(payload)
      await assert.rejects(products.getProducts(), error=>error instanceof client.ApiError && error.message === 'We could not read the products. Please try again.')
    }
    const fixture = {id:1,name:'Fixture',slug:'fixture',prices:{price:'1000',regular_price:'1000',sale_price:'1000'}}
    globalThis.fetch = async () => Response.json([fixture],{headers:{'x-wp-total':'1','x-wp-totalpages':'1'}})
    const page = await products.getProducts()
    assert.equal(page.items[0].price,'10')
    assert.equal(page.total,1)
    for (const payload of [{},null,{items:[{key:'item',quantity:'bad'}]}]) {
      globalThis.fetch = async () => Response.json(payload)
      for (const call of [()=>cart.getStoreCart(), ()=>cart.addStoreCartItem(1,1), ()=>cart.updateStoreCartItem('item',2), ()=>cart.removeStoreCartItem('item')]) {
        await assert.rejects(call(), error=>error instanceof client.ApiError && error.message === 'We could not confirm your cart. Refresh your bag before continuing.')
      }
    }
    const coordinator = createCartCoordinator(cart.getStoreCart,[])
    globalThis.fetch = async () => Response.json({})
    assert.equal(await coordinator.refresh(),false)
    assert.equal(coordinator.canCheckout(),false)
    assert.ok(coordinator.getSnapshot().error)
    globalThis.fetch = async () => Response.json({items:[]},{headers:{Nonce:'test-nonce'}})
    assert.deepEqual(await cart.getStoreCart(),[])
    const item = {key:'item',id:1,quantity:2,name:'Fixture',prices:fixture.prices}
    globalThis.fetch = async () => Response.json({items:[item]})
    assert.equal((await cart.getStoreCart())[0].quantity,2)
  })
})

test('logout clears private state first and submits exactly one native handoff even if revocation fails', async () => {
  await withApiModules(async ({auth,storage}) => {
    for (const outcome of ['success','expired','network','no-token']) {
      const forms = captureForms()
      const client = new QueryClient()
      const epoch = createSessionEpoch()
      const loginA = epoch.advance()
      client.setQueryData(profileKey(loginA),{id:1})
      client.setQueryData(ordersKey(loginA,1),['private A'])
      client.setQueryData(['categories'],['public'])
      storage.set('alahly-auth-token','old-test-token')
      globalThis.fetch = async () => {
        assert.equal(storage.get('alahly-auth-token'),undefined)
        assert.equal(client.getQueryData(ordersKey(loginA,1)),undefined)
        if (outcome === 'network') throw new TypeError('network unavailable')
        return Response.json(outcome === 'expired' ? {message:'Expired'} : {success:true},{status:outcome === 'expired'?401:200})
      }
      await auth.logoutWithWordPressHandoff(()=>{
        epoch.advance()
        storage.delete('alahly-auth-token')
        clearPrivateCache(client)
      },outcome === 'no-token'?undefined:'old-test-token')
      assert.equal(epoch.isCurrent(loginA),false)
      assert.equal(forms.length,1)
      assert.equal(forms[0].method,'POST')
      assert.equal(forms[0].action,'http://alahly.test/wp-admin/admin-post.php')
      assert.deepEqual(forms[0].fields.map(({name,value})=>({name,value})),[{name:'action',value:'alahly_spa_logout'}])
      const loginB = epoch.advance()
      client.setQueryData(profileKey(loginB),{id:2})
      assert.equal(client.getQueryData(profileKey(loginA)),undefined)
      assert.deepEqual(client.getQueryData(profileKey(loginB)),{id:2})
      assert.deepEqual(client.getQueryData(['categories']),['public'])
      client.clear()
    }
  })
})

test('Orders expiry action remains reachable after private-cache cleanup and invokes native logout', async () => {
  const plugin = {
    name:'orders-session-test',
    enforce:'pre',
    transform(code,id) {
      if (!decodeURI(id).replaceAll('\\','/').endsWith('/src/pages/Orders.tsx')) return
      return code.replace('"../store/AuthContext"','"orders-test-auth"').replace('"../hooks/useOrders"','"orders-test-query"')
    },
    resolveId(source) {
      if (source === 'orders-test-auth') return '\0orders-test-auth'
      if (source === 'orders-test-query') return '\0orders-test-query'
    },
    load(id) {
      if (id === '\0orders-test-auth') return 'export const useAuth = () => globalThis.__alahlyTestAuth'
      if (id === '\0orders-test-query') return 'export const useOrders = () => globalThis.__alahlyTestOrders'
    },
  }
  await withApiModules(async ({server,auth,client}) => {
    const {Orders} = await server.ssrLoadModule('/src/pages/Orders.tsx')
    const forms = captureForms()
    let clearCount = 0
    globalThis.__alahlyTestAuth = {isAuthenticated:false,isLoading:false,isSessionExpired:true,sessionScope:1,logout:()=>auth.logoutWithWordPressHandoff(()=>{clearCount++})}
    globalThis.__alahlyTestOrders = {isPending:true,isFetching:false,error:null}
    const html = renderToStaticMarkup(createElement(MemoryRouter,null,createElement(Orders)))
    assert.match(html,/Sign in again/)
    assert.doesNotMatch(html,/Loading your orders/)
    const button = findElement(Orders(),node=>node.type === 'button' && node.props.children === 'Sign in again')
    assert.ok(button)
    button.props.onClick()
    assert.equal(clearCount,1)
    assert.equal(forms.length,1)
    assert.equal(forms[0].fields[0].value,'alahly_spa_logout')
    globalThis.__alahlyTestAuth = {...globalThis.__alahlyTestAuth,isAuthenticated:true,isSessionExpired:false,currentUser:{id:1}}
    globalThis.__alahlyTestOrders = {isPending:false,isFetching:false,error:new client.ApiError('Expired',401)}
    assert.ok(findElement(Orders(),node=>node.type === 'button' && node.props.children === 'Sign in again'))
    globalThis.__alahlyTestAuth = {...globalThis.__alahlyTestAuth,isAuthenticated:false}
    globalThis.__alahlyTestOrders = {isPending:true,isFetching:false,error:null}
    assert.equal(Orders().props.to,'/login?returnTo=/my-account/orders')
  },[plugin])
})

test('auth HTTP requests use no-store, cancellation, and bounded logout', async () => {
  const server = await createServer({ configFile:false, appType:'custom', cacheDir:'node_modules/.cache/alahly-api-tests', optimizeDeps:{noDiscovery:true,include:[]}, server:{middlewareMode:true} })
  const originalFetch = globalThis.fetch
  const originalWindow = globalThis.window
  globalThis.window = {location:{origin:'http://alahly.test:5173'}}
  try {
    const auth = await server.ssrLoadModule('/src/api/auth.ts')
    let options
    globalThis.fetch = async (_url, value) => { options=value; return Response.json({id:1,email:'fixture@example.test',name:'Fixture'}) }
    await auth.getCurrentCustomer('test-token')
    assert.equal(options.cache, 'no-store')
    assert.equal(options.headers.Authorization, 'Bearer test-token')
    assert.ok(options.signal instanceof AbortSignal)
    const controller = new AbortController()
    globalThis.fetch = (_url, value) => new Promise((_, reject) => {
      value.signal.addEventListener('abort', () => reject(value.signal.reason), {once:true})
    })
    const profile = auth.getCurrentCustomer('test-token', controller.signal)
    controller.abort()
    await assert.rejects(profile, {name:'AbortError'})
    const started=Date.now()
    await assert.rejects(auth.logoutCustomer('test-token'), /Unable to reach/)
    assert.ok(Date.now()-started < 5000, 'logout was not bounded to three seconds')
  } finally {
    globalThis.fetch=originalFetch
    globalThis.window=originalWindow
    await server.close()
  }
})
