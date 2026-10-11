import { index, route, type RouteConfig } from "@react-router/dev/routes";
export default [
  index("routes/home.tsx"),
  route("products", "routes/products.tsx"),
  route("products/:slug", "routes/product.tsx"),
  route("categories/:slug", "routes/category.tsx"),
  route("cart", "routes/cart.tsx"),
  route("checkout", "routes/checkout.tsx"),
  route("login", "routes/login.tsx"),
  route("signup", "routes/signup.tsx"),
  route("my-account", "routes/account.tsx"),
  route("my-account/orders", "routes/orders.tsx"),
  route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;
