import { z } from "zod";
import { apiRequest } from "./client";
import type { CartItem } from "../types/cart";
import type { ProductImage } from "../types/product";

const tokenKey = "alahly-store-cart-token";
const itemSchema = z.object({
  key: z.string(),
  id: z.number(),
  quantity: z.number(),
  name: z.string(),
  sku: z.string().default(""),
  images: z
    .array(
      z.object({
        id: z.number(),
        src: z.string(),
        thumbnail: z.string().optional(),
        name: z.string().default(""),
        alt: z.string().default(""),
      }),
    )
    .default([]),
  prices: z.object({
    price: z.string(),
    regular_price: z.string(),
    sale_price: z.string(),
    currency_minor_unit: z.number().default(2),
  }),
  variation: z
    .array(z.object({ attribute: z.string(), value: z.string() }))
    .default([]),
});
const cartSchema = z.object({ items: z.array(itemSchema).default([]) });
const readToken = () => sessionStorage.getItem(tokenKey) ?? undefined;
const rememberToken = (headers: Headers) => {
  const token = headers.get("Cart-Token");
  if (token) sessionStorage.setItem(tokenKey, token);
};
const minorToDecimal = (price: string, digits: number) =>
  String(Number(price) / 10 ** digits);
const toCartItem = (item: z.infer<typeof itemSchema>): CartItem => ({
  key: item.key,
  quantity: item.quantity,
  variationId: item.id,
  selectedAttributes: Object.fromEntries(
    item.variation.map((attribute) => [attribute.attribute, attribute.value]),
  ),
  product: {
    id: item.id,
    name: item.name,
    slug: "",
    permalink: "",
    type: "simple",
    description: "",
    short_description: "",
    sku: item.sku,
    price: minorToDecimal(item.prices.price, item.prices.currency_minor_unit),
    regular_price: minorToDecimal(
      item.prices.regular_price,
      item.prices.currency_minor_unit,
    ),
    sale_price: minorToDecimal(
      item.prices.sale_price,
      item.prices.currency_minor_unit,
    ),
    on_sale: item.prices.price !== item.prices.regular_price,
    stock_status: "instock",
    stock_quantity: null,
    average_rating: "0",
    rating_count: 0,
    images: item.images as ProductImage[],
    categories: [],
    tags: [],
    attributes: [],
    variations: [],
    has_options: false,
  },
});
const cartHeaders = () =>
  readToken() ? { "Cart-Token": readToken()! } : undefined;
const sync = (data: unknown, headers: Headers) => {
  rememberToken(headers);
  return cartSchema.parse(data).items.map(toCartItem);
};

export async function getStoreCart(): Promise<CartItem[]> {
  const { data, headers } = await apiRequest<unknown>("/cart", {
    headers: cartHeaders(),
  });
  return sync(data, headers);
}
export async function addStoreCartItem(
  id: number,
  quantity: number,
  variation?: Array<{ attribute: string; value: string }>,
): Promise<CartItem[]> {
  const { data, headers } = await apiRequest<unknown>("/cart/add-item", {
    method: "POST",
    headers: cartHeaders(),
    body: { id, quantity, ...(variation?.length ? { variation } : {}) },
  });
  return sync(data, headers);
}
export async function updateStoreCartItem(
  key: string,
  quantity: number,
): Promise<CartItem[]> {
  const { data, headers } = await apiRequest<unknown>("/cart/update-item", {
    method: "POST",
    headers: cartHeaders(),
    body: { key, quantity },
  });
  return sync(data, headers);
}
export async function removeStoreCartItem(key: string): Promise<CartItem[]> {
  const { data, headers } = await apiRequest<unknown>("/cart/remove-item", {
    method: "POST",
    headers: cartHeaders(),
    body: { key },
  });
  return sync(data, headers);
}

export const getStoreCartToken = () => readToken()
