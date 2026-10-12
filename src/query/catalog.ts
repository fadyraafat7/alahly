import { queryOptions } from "@tanstack/react-query";
import { getProducts, getProduct, getVariations } from "../api/products";
import { getCategories, getCategory } from "../api/categories";
import type { ApiContext } from "../api/client";
import type { ProductQuery } from "../types/product";
import { normalizeProductQuery } from '../utils/catalogParams';
import { catalogPolicy, categoryPolicy, retryCatalog } from './policy';
const policy = (context?: ApiContext, category = false) => ({
  ...(category ? categoryPolicy : catalogPolicy),
  retry: context ? false as const : retryCatalog,
  ...(context ? { gcTime: Infinity, refetchInterval: false as const } : {}),
});
export const productsQuery = (
  params: ProductQuery = {},
  context?: ApiContext,
) => {
  const normalized = normalizeProductQuery(params);
  return queryOptions({
    ...policy(context),
    queryKey: ["products", normalized],
    queryFn: ({ signal }) =>
      getProducts(normalized, { ...context, signal: context?.signal ?? signal }),
  });
};
export const productQuery = (slug: string, context?: ApiContext) =>
  queryOptions({
    ...policy(context),
    queryKey: ["product", slug.trim()],
    queryFn: ({ signal }) => getProduct(slug.trim(), { ...context, signal: context?.signal ?? signal }),
  });
export const variationsQuery = (id: number, context?: ApiContext) =>
  queryOptions({
    ...policy(context),
    queryKey: ["variations", id],
    queryFn: ({ signal }) => getVariations(id, { ...context, signal: context?.signal ?? signal }),
  });
export const categoriesQuery = (context?: ApiContext) =>
  queryOptions({
    ...policy(context, true),
    queryKey: ["categories"],
    queryFn: ({ signal }) => getCategories({ ...context, signal: context?.signal ?? signal }),
  });
export const categoryQuery = (slug: string, context?: ApiContext) =>
  queryOptions({
    ...policy(context, true),
    queryKey: ["category", slug.trim()],
    queryFn: ({ signal }) => getCategory(slug.trim(), { ...context, signal: context?.signal ?? signal }),
  });
