import {
  data,
  isRouteErrorResponse,
  type LoaderFunctionArgs,
} from "react-router";
import { dehydrate } from "@tanstack/react-query";
import { createQueryClient } from "../../src/query/client";
import {
  productsQuery,
  productQuery,
  categoriesQuery,
  categoryQuery,
  variationsQuery,
} from "../../src/query/catalog";
import { catalogParams, categoryParams } from "../../src/utils/catalogParams";
import { plainText } from "../../src/utils/html";
import { ApiError } from "../../src/api/client";

export async function loadCatalog(
  kind: "home" | "products" | "product" | "category",
  { request, params }: LoaderFunctionArgs,
) {
  const client = createQueryClient();
  const wpSite =
    process.env.VITE_WP_SITE_URL || import.meta.env.VITE_WP_SITE_URL;
  if (!wpSite)
    throw data(
      { message: "WordPress origin is not configured." },
      { status: 503 },
    );
  const baseUrl =
    process.env.WC_STORE_API_URL ||
    new URL(
      process.env.VITE_WC_STORE_API_URL ||
        import.meta.env.VITE_WC_STORE_API_URL ||
        "/wp-json/wc/store/v1",
      wpSite,
    ).href;
  const context = { baseUrl, signal: request.signal };
  const url = new URL(request.url);
  let title = "Alahly | Thoughtful goods for everyday living";
  let description =
    "Explore collections, new arrivals, and special offers at Alahly.";
  const origin = process.env.STOREFRONT_URL || wpSite;
  const canonical = new URL(url.pathname, origin);
  // Keep pagination; search and filtered results are not canonical catalog pages.
  const page = catalogParams(url.searchParams).page ?? 1;
  if (page > 1 && (kind === "products" || kind === "category"))
    canonical.searchParams.set("page", String(page));
  const noindex = [
    "search",
    "category",
    "min_price",
    "max_price",
    "on_sale",
    "orderby",
  ].some((key) => url.searchParams.has(key));
  try {
    if (kind === "home") {
      await Promise.all([
        client.fetchQuery(categoriesQuery(context)),
        client.fetchQuery(
          productsQuery({ featured: true, per_page: 4 }, context),
        ),
        client.fetchQuery(
          productsQuery(
            { per_page: 8, orderby: "date", order: "desc" },
            context,
          ),
        ),
        client.fetchQuery(
          productsQuery({ on_sale: true, per_page: 4 }, context),
        ),
      ]);
    } else if (kind === "products") {
      await Promise.all([
        client.fetchQuery(categoriesQuery(context)),
        client.fetchQuery(
          productsQuery(catalogParams(url.searchParams), context),
        ),
      ]);
      title = url.searchParams.get("search")
        ? `Search: ${url.searchParams.get("search")} | Alahly`
        : "Shop all products | Alahly";
      description =
        "Browse Alahly products, compare prices, and find your next favorite.";
    } else if (kind === "category") {
      const categories = await client.fetchQuery(categoriesQuery(context));
      const category = categories.find((item) => item.slug === params.slug);
      if (!category) throw data(null, { status: 404 });
      client.setQueryData(categoryQuery(params.slug!).queryKey, category);
      await client.fetchQuery(
        productsQuery(categoryParams(url.searchParams, category.id), context),
      );
      title = `${plainText(category.name)} | Alahly`;
      description =
        plainText(category.description) ||
        `Shop the ${category.name} collection at Alahly.`;
    } else {
      const product = await client.fetchQuery(
        productQuery(params.slug!, context),
      );
      if (!product) throw data(null, { status: 404 });
      await Promise.all([
        client.fetchQuery(
          productsQuery({ related: product.id, per_page: 4 }, context),
        ),
        ...(product.type === "variable"
          ? [client.fetchQuery(variationsQuery(product.id, context))]
          : []),
      ]);
      title = `${plainText(product.name)} | Alahly`;
      description =
        plainText(product.short_description || product.description) ||
        `Discover ${product.name} at Alahly.`;
    }
    return data(
      {
        dehydratedState: dehydrate(client),
        seo: {
          title,
          description: description.slice(0, 160),
          canonical: canonical.href,
          noindex,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (
      isRouteErrorResponse(error) ||
      (error &&
        typeof error === "object" &&
        "type" in error &&
        error.type === "DataWithResponseInit")
    )
      throw error;
    if (error instanceof Response) throw error;
    throw data(null, {
      status: error instanceof ApiError && error.status === 404 ? 404 : 503,
      headers: { "Cache-Control": "no-store" },
    });
  } finally {
    client.clear();
  }
}
