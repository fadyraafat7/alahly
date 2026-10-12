import test from 'node:test'
import assert from 'node:assert/strict'
import { QueryClient } from '@tanstack/query-core'
import { applyCachePolicy } from '../app/lib/cachePolicy.ts'
import { clearPrivateCache, createSessionEpoch, profileKey, ordersKey } from '../src/query/privateSession.ts'
import { requestSignal } from '../src/utils/requestSignal.ts'

test('response policy overrides public caching without losing unrelated headers', () => {
  const headers = applyCachePolicy(new Headers({ 'Cache-Control': 'public, max-age=300', 'Set-Cookie': 'test=value; HttpOnly' }))
  assert.equal(headers.get('Cache-Control'), 'private, no-store')
  assert.ok(headers.get('Set-Cookie').includes('HttpOnly'))
})

test('late Customer A response cannot overwrite Customer B or recreate private cache', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  let finish
  const old = client.fetchQuery({ queryKey: profileKey(1), queryFn: () => new Promise(resolve => { finish = resolve }) }).catch(() => undefined)
  client.setQueryData(ordersKey(1, 1), ['private A'])
  client.setQueryData(['categories'], ['public'])
  clearPrivateCache(client)
  client.setQueryData(profileKey(2), { id: 2 })
  finish({ id: 1 })
  await old
  assert.equal(client.getQueryData(profileKey(1)), undefined)
  assert.equal(client.getQueryData(ordersKey(1, 1)), undefined)
  assert.deepEqual(client.getQueryData(profileKey(2)), { id: 2 })
  assert.deepEqual(client.getQueryData(['categories']), ['public'])
  client.clear()
})

test('logout/new login invalidates any pending login completion', () => {
  const epoch = createSessionEpoch()
  const loginA = epoch.advance()
  const logout = epoch.advance()
  assert.equal(epoch.isCurrent(loginA), false)
  const loginB = epoch.advance()
  assert.equal(epoch.isCurrent(logout), false)
  assert.equal(epoch.isCurrent(loginB), true)
})

test('request signals honor caller cancellation and bounded timeouts', async () => {
  const parent = new AbortController()
  const combined = requestSignal(parent.signal, 100)
  parent.abort()
  assert.equal(combined.aborted, true)
  const timeout = requestSignal(undefined, 10)
  await new Promise(resolve => setTimeout(resolve, 25))
  assert.equal(timeout.aborted, true)
  assert.equal(timeout.reason.name, 'TimeoutError')
})
