import { z } from "zod";
import { apiGet } from "./client";
import type {
  Product,
  ProductPage,
  ProductQuery,
  ProductVariation,
} from "../types/product";

const taxonomySchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
});
const imageSchema = z.object({
  id: z.number(),
  src: z.string(),
  thumbnail: z.string().optional(),
  name: z.string().default(""),
  alt: z.string().default(""),
});
const attributeSchema = z.object({
  name: z.string(),
  terms: z
    .array(z.object({ name: z.string(), slug: z.string().default("") }))
    .default([]),
});
const storeProductSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    slug: z.string(),
    permalink: z.string().default(""),
    type: z.string().default("simple"),
    description: z.string().default(""),
    short_description: z.string().default(""),
    sku: z.string().default(""),
    prices: z.object({
      price: z.string(),
      regular_price: z.string(),
      sale_price: z.string(),
      currency_minor_unit: z.number().default(2),
    }),
    on_sale: z.boolean().default(false),
    is_in_stock: z.boolean().default(true),
    is_on_backorder: z.boolean().default(false),
    average_rating: z.string().default("0"),
    review_count: z.number().default(0),
    images: z.array(imageSchema).default([]),
    categories: z.array(taxonomySchema).default([]),
    tags: z.array(taxonomySchema).default([]),
    attributes: z.array(attributeSchema).default([]),
    variations: z.array(z.number()).default([]),
    has_options: z.boolean().default(false),
  })
  .passthrough();

type StoreProduct = z.infer<typeof storeProductSchema>;
const toDecimal = (minorPrice: string, digits: number) =>
  String(Number(minorPrice) / 10 ** digits);
const toProduct = (item: StoreProduct): Product => ({
  id: item.id,
  name: item.name,
  slug: item.slug,
  permalink: item.permalink,
  type: item.type,
  description: item.description,
  short_description: item.short_description,
  sku: item.sku,
  price: toDecimal(item.prices.price, item.prices.currency_minor_unit),
  regular_price: toDecimal(
    item.prices.regular_price,
    item.prices.currency_minor_unit,
  ),
  sale_price: toDecimal(
    item.prices.sale_price,
    item.prices.currency_minor_unit,
  ),
  on_sale: item.on_sale,
  stock_status: item.is_in_stock
    ? "instock"
    : item.is_on_backorder
      ? "onbackorder"
      : "outofstock",
  stock_quantity: null,
  average_rating: item.average_rating,
  rating_count: item.review_count,
  images: item.images,
  categories: item.categories,
  tags: item.tags,
  attributes: item.attributes.map((attribute) => ({
    id: 0,
    name: attribute.name,
    option: "",
    options: attribute.terms.map((term) => term.name),
    variation: item.has_options,
    visible: true,
  })),
  variations: item.variations,
  has_options: item.has_options,
});
const pageMeta = (headers: Headers, count: number) => ({
  total: Number(headers.get("x-wp-total") ?? count),
  totalPages: Number(headers.get("x-wp-totalpages") ?? 1),
});

export async function getProducts(
  params: ProductQuery = {},
): Promise<ProductPage> {
  const storeParams = {
    ...params,
    min_price:
      params.min_price === undefined
        ? undefined
        : Math.round(params.min_price * 100),
    max_price:
      params.max_price === undefined
        ? undefined
        : Math.round(params.max_price * 100),
  };
  const { data, headers } = await apiGet<unknown>("/products", storeParams);
  const items = z.array(storeProductSchema).parse(data).map(toProduct);
  return { items, ...pageMeta(headers, items.length) };
}
export async function getProduct(slug: string): Promise<Product | undefined> {
  const result = await getProducts({ slug, per_page: 1 });
  return result.items[0];
}
export async function getVariations(
  productId: number,
): Promise<ProductVariation[]> {
  const page = await getProducts({
    parent: productId,
    type: "variation",
    per_page: 100,
  });
  return page.items.map((product) => ({
    id: product.id,
    price: product.price,
    regular_price: product.regular_price,
    sale_price: product.sale_price,
    stock_status: product.stock_status,
    attributes: product.attributes.map((attribute) => ({
      name: attribute.name,
      option: attribute.option,
    })),
    image: product.images[0],
  }));
}
