import test from 'node:test'
import assert from 'node:assert/strict'
import { createCartCoordinator } from '../src/store/cartCoordinator.ts'
import { validateServerConfig } from '../app/lib/serverConfig.ts'

test('cart read failure is not an empty-cart success; refresh recovers', async () => {
  let unavailable = true
  const cart = createCartCoordinator(async () => { if (unavailable) throw new Error(); return ['item'] }, [])
  assert.equal(await cart.refresh(), false)
  assert.ok(cart.getSnapshot().error)
  assert.equal(cart.canCheckout(), false)
  unavailable = false
  assert.equal(await cart.refresh(), true)
  assert.deepEqual(cart.getSnapshot().items, ['item'])
  assert.equal(cart.canCheckout(), true)
  assert.equal(cart.getServerSnapshot().isSyncing, true)
  assert.deepEqual(cart.getServerSnapshot().items, [])
})

test('pending mutations block checkout and overlapping writes; failure requires reconciliation', async () => {
  const cart = createCartCoordinator(async () => ['server item'], [])
  await cart.refresh()
  let finish
  const first = cart.mutate(() => new Promise(resolve => { finish = resolve }))
  assert.equal(cart.canCheckout(), false)
  assert.equal(await cart.mutate(async () => { assert.fail('overlap ran') }), false)
  finish(['updated'])
  await first
  assert.deepEqual(cart.getSnapshot().items, ['updated'])
  assert.equal(cart.canCheckout(), true)
  await cart.mutate(async () => { throw new Error('response lost') })
  assert.deepEqual(cart.getSnapshot().items, ['updated'])
  assert.equal(cart.canCheckout(), false)
  assert.equal(await cart.mutate(async () => { assert.fail('ambiguous write retried') }), false)
  await cart.refresh()
  assert.equal(cart.canCheckout(), true)
})

test('old-session cart completion cannot restore contents after reset', async () => {
  let finish
  const cart = createCartCoordinator(() => new Promise(resolve => { finish = resolve }), [])
  const old = cart.refresh()
  cart.reset('Session changed')
  finish(['previous customer'])
  await old
  assert.deepEqual(cart.getSnapshot().items, [])
  assert.equal(cart.getSnapshot().error, 'Session changed')
  assert.equal(cart.getSnapshot().isSyncing, false)
  assert.equal(cart.canCheckout(), false)
})

const compiled = { VITE_WP_SITE_URL:'http://alahly.test', VITE_WC_STORE_API_URL:'/wp-json/wc/store/v1' }
test('server config validates URL safety and rejects build/runtime mismatch', () => {
  assert.equal(validateServerConfig({}, compiled).loaderTimeoutMs, 10_000)
  for (const url of ['ftp://store.test', 'http://user:secret@store.test', 'http://store.test?secret=1', '//store.test']) {
    assert.throws(() => validateServerConfig({WC_STORE_API_URL:url}, compiled), /configuration/)
  }
  assert.throws(() => validateServerConfig({}, {}), /VITE_WP_SITE_URL/)
  assert.throws(() => validateServerConfig({VITE_WP_SITE_URL:'http://other.test'}, compiled), /client build/)
  assert.throws(() => validateServerConfig({WC_LOADER_TIMEOUT_MS:'Infinity'}, compiled), /integer/)
  assert.equal(validateServerConfig({WC_LOADER_TIMEOUT_MS:'5000'}, compiled).loaderTimeoutMs, 5000)
})
