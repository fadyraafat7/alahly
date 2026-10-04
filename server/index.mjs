import dotenv from 'dotenv'
import cors from 'cors'
import express from 'express'

dotenv.config({ path: '.env.backend' })

const app = express()
const port = Number(process.env.PORT || 5000)
const apiUrl = process.env.WC_API_URL?.replace(/\/$/, '')
const consumerKey = process.env.WC_CONSUMER_KEY
const consumerSecret = process.env.WC_CONSUMER_SECRET

if (!apiUrl || !consumerKey || !consumerSecret) {
  console.error('Missing WC_API_URL, WC_CONSUMER_KEY, or WC_CONSUMER_SECRET in .env.backend.')
  process.exit(1)
}

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173' }))

const forward = async (request, response, path) => {
  const url = new URL(`${apiUrl}${path}`)
  Object.entries(request.query).forEach(([key, value]) => {
    if (Array.isArray(value)) value.forEach((item) => url.searchParams.append(key, item))
    else if (value !== undefined) url.searchParams.set(key, value)
  })

  try {
    const upstream = await fetch(url, {
      headers: {
        Accept: 'application/json',
        Authorization: `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')}`,
      },
    })
    const body = await upstream.text()
    const total = upstream.headers.get('x-wp-total')
    const totalPages = upstream.headers.get('x-wp-totalpages')
    if (total) response.setHeader('X-WP-Total', total)
    if (totalPages) response.setHeader('X-WP-TotalPages', totalPages)
    response.status(upstream.status).type('application/json').send(body)
  } catch (error) {
    console.error(`WooCommerce request failed for ${path}:`, error instanceof Error ? error.message : error)
    response.status(502).json({ message: 'The WooCommerce store could not be reached.' })
  }
}

app.get('/api/health', (_request, response) => response.json({ status: 'ok' }))
app.get('/api/products', (request, response) => forward(request, response, '/products'))
app.get('/api/products/categories', (request, response) => forward(request, response, '/products/categories'))
app.get('/api/products/tags', (request, response) => forward(request, response, '/products/tags'))
app.get('/api/products/:id/variations', (request, response) => forward(request, response, `/products/${encodeURIComponent(request.params.id)}/variations`))

app.listen(port, () => console.log(`WooCommerce proxy listening at http://localhost:${port}/api`))
