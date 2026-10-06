import { Route, Routes } from 'react-router-dom'
import { CartDrawer } from './components/cart/CartDrawer'
import { Layout } from './components/layout/Layout'
import { Cart } from './pages/Cart'
import { Category } from './pages/Category'
import { Checkout } from './pages/Checkout'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { MyAccount } from './pages/MyAccount'
import { NotFound } from './pages/NotFound'
import { Orders } from './pages/Orders'
import { ProductDetails } from './pages/ProductDetails'
import { Products } from './pages/Products'

function App() { return <Layout><Routes>
  <Route path="/" element={<Home />} />
  <Route path="/products" element={<Products />} />
  <Route path="/products/:slug" element={<ProductDetails />} />
  <Route path="/categories/:slug" element={<Category />} />
  <Route path="/cart" element={<Cart />} />
  <Route path="/checkout" element={<Checkout />} />
  <Route path="/login" element={<Login />} />
  <Route path="/my-account" element={<MyAccount />} />
  <Route path="/my-account/orders" element={<Orders />} />
  <Route path="*" element={<NotFound />} />
</Routes><CartDrawer /></Layout> }
export default App