import { Minus, Plus, ShoppingBag, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ErrorState } from "../components/common/ErrorState";
import {
  ProductDetailsSkeleton,
  ProductGridSkeleton,
} from "../components/common/Skeletons";
import { SafeHtml } from "../components/common/SafeHtml";
import { ProductGallery } from "../components/product/ProductGallery";
import { ProductGrid } from "../components/product/ProductGrid";
import { useProduct, useVariations } from "../hooks/useProduct";
import { useProducts } from "../hooks/useProducts";
import { useCart } from "../store/CartContext";
import { discountPercent, formatPrice } from "../utils/format";
export function ProductDetails() {
  const { slug = "" } = useParams();
  const productQuery = useProduct(slug);
  const product = productQuery.data;
  const variations = useVariations(product?.id, product?.type === "variable");
  const related = useProducts(
    { related: product?.id, per_page: 4 },
    Boolean(product),
  );
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const eligible = useMemo(
    () =>
      variations.data?.find((variation) =>
        Object.entries(selected).every(([name, option]) =>
          variation.attributes.some(
            (attribute) =>
              attribute.name === name && attribute.option === option,
          ),
        ),
      ),
    [variations.data, selected],
  );
  if (productQuery.isLoading)
    return (
      <main className="mx-auto max-w-7xl px-6 py-12">
        <ProductDetailsSkeleton />
      </main>
    );
  if (productQuery.isError)
    return (
      <main className="mx-auto max-w-7xl px-6 py-12">
        <ErrorState
          message={productQuery.error.message}
          onRetry={() => productQuery.refetch()}
        />
      </main>
    );
  if (!product)
    return (
      <main className="mx-auto max-w-7xl px-6 py-20 text-center">
        <h1 className="font-display text-4xl font-bold">Product not found</h1>
        <Link
          to="/products"
          className="mt-5 inline-block text-sm font-bold text-moss underline"
        >
          Return to shop
        </Link>
      </main>
    );
  const activePrice =
    eligible?.sale_price ||
    eligible?.price ||
    product.sale_price ||
    product.price ||
    product.regular_price;
  const regular = eligible?.regular_price || product.regular_price;
  const discount = discountPercent(regular, activePrice);
  const selectable = product.attributes.filter(
    (attribute) => attribute.variation && attribute.options.length,
  );
  const needsSelection =
    selectable.length > 0 &&
    selectable.some((attribute) => !selected[attribute.name]);
  const inStock =
    (eligible?.stock_status ?? product.stock_status) !== "outofstock";
  return (
    <>
      <main className="mx-auto max-w-7xl px-6 py-8 sm:py-12">
        <p className="mb-6 text-sm text-ink/55">
          <Link to="/products" className="hover:text-moss">
            Shop
          </Link>{" "}
          <span className="mx-2">/</span> {product.name}
        </p>
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <ProductGallery images={product.images} name={product.name} />
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-moss">
              {product.categories[0]?.name || "Collection"}
            </p>
            <h1 className="mt-3 font-display text-4xl font-bold leading-tight sm:text-5xl">
              {product.name}
            </h1>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <Star size={17} className="fill-amber-400 text-amber-400" />
              <b>{Number(product.average_rating || 0).toFixed(1)}</b>
              <span className="text-ink/50">
                based on {product.rating_count} reviews
              </span>
            </div>
            <div className="mt-6 flex items-end gap-3">
              <span className="font-display text-3xl font-bold text-moss">
                {formatPrice(activePrice)}
              </span>
              {regular && activePrice !== regular && (
                <del className="mb-1 text-ink/45">{formatPrice(regular)}</del>
              )}
              {discount > 0 && (
                <span className="mb-1 rounded-full bg-clay/10 px-2 py-1 text-xs font-bold text-clay">
                  Save {discount}%
                </span>
              )}
            </div>
            {product.short_description && (
              <SafeHtml
                html={product.short_description}
                className="mt-6 text-sm leading-7 text-ink/70"
              />
            )}
            {selectable.map((attribute) => (
              <fieldset key={attribute.name} className="mt-7">
                <legend className="mb-3 text-sm font-bold">
                  {attribute.name}
                  {selected[attribute.name] && (
                    <span className="ml-2 font-normal text-ink/55">
                      {selected[attribute.name]}
                    </span>
                  )}
                </legend>
                <div className="flex flex-wrap gap-2">
                  {attribute.options.map((option) => (
                    <button
                      key={option}
                      onClick={() =>
                        setSelected((current) => ({
                          ...current,
                          [attribute.name]: option,
                        }))
                      }
                      className={`rounded-full border px-4 py-2 text-sm ${selected[attribute.name] === option ? "border-moss bg-moss text-white" : "border-ink/20 bg-white hover:border-moss"}`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </fieldset>
            ))}
            {variations.isLoading && (
              <p className="mt-4 text-sm text-ink/55">
                Loading available optionsâ€¦
              </p>
            )}
            <div className="mt-8 flex flex-wrap gap-3">
              <div className="flex items-center rounded-full border border-ink/20 bg-white">
                <button
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  aria-label="Decrease quantity"
                  className="p-3"
                >
                  <Minus size={17} />
                </button>
                <span className="w-8 text-center font-bold">{quantity}</span>
                <button
                  onClick={() => setQuantity((value) => value + 1)}
                  aria-label="Increase quantity"
                  className="p-3"
                >
                  <Plus size={17} />
                </button>
              </div>
              <button
                disabled={!inStock || needsSelection}
                onClick={() =>
                  addItem(product, quantity, eligible?.id, selected)
                }
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-moss px-6 py-3 text-sm font-bold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:bg-ink/30"
              >
                <ShoppingBag size={18} />
                {!inStock
                  ? "Out of stock"
                  : needsSelection
                    ? "Choose options"
                    : "Add to bag"}
              </button>
            </div>
            <p
              className={`mt-3 text-sm font-bold ${inStock ? "text-moss" : "text-clay"}`}
            >
              {inStock ? "In stock and ready to ship" : "Currently unavailable"}
            </p>
            <dl className="mt-8 grid gap-3 border-t border-ink/10 pt-6 text-sm">
              <div className="flex gap-2">
                <dt className="font-bold">SKU:</dt>
                <dd>{product.sku || "â€”"}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-bold">Categories:</dt>
                <dd>
                  {product.categories.map((item) => (
                    <Link
                      className="mr-2 text-moss underline"
                      key={item.id}
                      to={`/categories/${item.slug}`}
                    >
                      {item.name}
                    </Link>
                  ))}
                </dd>
              </div>
              {product.tags.length > 0 && (
                <div className="flex gap-2">
                  <dt className="font-bold">Tags:</dt>
                  <dd>{product.tags.map((item) => item.name).join(", ")}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
        {product.description && (
          <section className="mt-16 max-w-3xl border-t border-ink/10 pt-10">
            <h2 className="font-display text-3xl font-bold">Details</h2>
            <SafeHtml
              html={product.description}
              className="mt-5 text-sm leading-7 text-ink/70"
            />
          </section>
        )}
      </main>
      {related.data?.items.length ? (
        <section className="mx-auto max-w-7xl px-6 py-12">
          <h2 className="mb-7 font-display text-3xl font-bold">
            You may also like
          </h2>
          {related.isLoading ? (
            <ProductGridSkeleton count={4} />
          ) : related.data?.items.length ? (
            <ProductGrid products={related.data.items} />
          ) : null}
        </section>
      ) : null}
    </>
  );
}
