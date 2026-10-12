import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'

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
