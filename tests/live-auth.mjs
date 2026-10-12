import assert from 'node:assert/strict'
const origin=process.env.ALAHLY_TEST_ORIGIN || 'http://alahly.test:5173'
if (!new URL(origin).hostname.endsWith('.test')) throw new Error('Use a named local .test environment.')
const emails=[process.env.ALAHLY_TEST_CUSTOMER_A_EMAIL,process.env.ALAHLY_TEST_CUSTOMER_B_EMAIL]
const password=process.env.ALAHLY_TEST_PASSWORD
if (emails.some(email=>!email) || !password) throw new Error('Supply two test customer emails and ALAHLY_TEST_PASSWORD in the process environment.')
const base=origin+'/wp-json/alahly-spa/v1'
async function api(path, status, options={}) {
  const response=await fetch(base+path,{...options,signal:AbortSignal.timeout(15000)})
  assert.equal(response.status,status,path)
  assert.match(response.headers.get('Cache-Control') || '',/private/)
  assert.match(response.headers.get('Cache-Control') || '',/no-store/)
  return response.json()
}
const orderSets=[]
await api('/orders',401)
for(const [index,email] of emails.entries()) {
  let token
  try {
    const login=await api('/auth/login',200,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({username:email,password})})
    token=login.token
    assert.ok(token)
    const headers={Authorization:'Bearer '+token}
    const me=await api('/auth/me',200,{headers})
    assert.equal(me.id,login.user.id)
    const own=await api('/orders',200,{headers})
    const tampered=await api('/orders?customer_id=1',200,{headers})
    assert.deepEqual(tampered,own)
    orderSets.push(own.map(order=>order.id))
    console.log('PASS Customer '+(index+1)+': login/profile/order headers, token-derived ownership ('+own.length+' orders)')
  } finally {
    if(token) {
      await api('/auth/logout',200,{method:'POST',headers:{Authorization:'Bearer '+token}})
      await api('/auth/me',401,{headers:{Authorization:'Bearer '+token}})
    }
  }
}
assert.ok(!orderSets[0].some(id=>orderSets[1].includes(id)))
console.log('PASS customer order isolation and revoked-token denial. HTTP only; not a browser session test.')
