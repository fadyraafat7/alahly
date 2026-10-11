import { queryOptions } from "@tanstack/react-query";
import { getProducts, getProduct, getVariations } from "../api/products";
import { getCategories, getCategory } from "../api/categories";
import type { ApiContext } from "../api/client";
import type { ProductQuery } from "../types/product";
export const productsQuery = (
  params: ProductQuery = {},
  context?: ApiContext,
) =>
  queryOptions({
    queryKey: ["products", params],
    queryFn: ({ signal }) =>
      getProducts(params, { ...context, signal: context?.signal ?? signal }),
  });
export const productQuery = (slug: string, context?: ApiContext) =>
  queryOptions({
    queryKey: ["product", slug],
    queryFn: () => getProduct(slug, context),
  });
export const variationsQuery = (id: number, context?: ApiContext) =>
  queryOptions({
    queryKey: ["variations", id],
    queryFn: () => getVariations(id, context),
  });
export const categoriesQuery = (context?: ApiContext) =>
  queryOptions({
    queryKey: ["categories"],
    queryFn: () => getCategories(context),
    staleTime: 300_000,
  });
export const categoryQuery = (slug: string, context?: ApiContext) =>
  queryOptions({
    queryKey: ["category", slug],
    queryFn: () => getCategory(slug, context),
    staleTime: 300_000,
  });
