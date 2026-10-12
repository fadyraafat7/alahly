import {
  data,
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
import { serverConfig } from './config.server';
import { requestSignal } from '../../src/utils/requestSignal';

export async function loadCatalog(
  kind: "home" | "products" | "product" | "category",
  { request, params }: LoaderFunctionArgs,
) {
  const client = createQueryClient();
  // One deadline spans all dependent/parallel fetches. No loader-level retries.
  const signal = requestSignal(request.signal, serverConfig.loaderTimeoutMs);
  const context = { baseUrl: serverConfig.storeApiUrl, signal };
  const url = new URL(request.url);
  let title = "Alahly | Thoughtful goods for everyday living";
  let description =
    "Explore collections, new arrivals, and special offers at Alahly.";
  const origin = serverConfig.canonicalOrigin;
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
      if (!category) throw new Response(null, { status: 404 });
      await client.fetchQuery({ ...categoryQuery(params.slug!, context), queryFn: () => category });
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
      if (!product) throw new Response(null, { status: 404 });
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
        dehydratedState: dehydrate(client, { shouldDehydrateQuery: query => query.meta?.public === true && query.state.status === 'success' }),
        seo: {
          title,
          description: description.slice(0, 160),
          canonical: canonical.href,
          noindex,
        },
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof Response) throw error;
    throw data(null, {
      status: signal.aborted && signal.reason?.name === 'TimeoutError' ? 504 : error instanceof ApiError && error.status === 404 ? 404 : 503,
      headers: { "Cache-Control": "private, no-store" },
    });
  } finally {
    client.clear();
  }
}
