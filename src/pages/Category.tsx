import { Link, useParams, useSearchParams } from "react-router";
import { ErrorState } from "../components/common/ErrorState";
import { ProductGridSkeleton } from "../components/common/Skeletons";
import { SafeHtml } from "../components/common/SafeHtml";
import { ProductGrid } from "../components/product/ProductGrid";
import { useCategory } from "../hooks/useCategories";
import { useProducts } from "../hooks/useProducts";
import { categoryParams } from "../utils/catalogParams";
export function Category() {
  const { slug = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const { page = 1, orderby = "date" } = categoryParams(params);
  const setPage = (value: number) =>
    setParams((current) => {
      current.set("page", String(value));
      return current;
    });
  const category = useCategory(slug);
  const products = useProducts(
    categoryParams(params, category.data?.id),
    Boolean(category.data),
  );
  if (category.isLoading)
    return (
      <main className="mx-auto max-w-7xl px-6 py-14">
        <div className="h-48 animate-pulse rounded-3xl bg-sand" />
      </main>
    );
  if (category.isError)
    return (
      <main className="mx-auto max-w-7xl px-6 py-14">
        <ErrorState
          message={category.error.message}
          onRetry={() => category.refetch()}
        />
      </main>
    );
  if (!category.data)
    return (
      <main className="mx-auto max-w-7xl px-6 py-20 text-center">
        <h1 className="font-display text-4xl font-bold">
          Collection not found
        </h1>
        <Link
          to="/products"
          className="mt-5 inline-block text-sm font-bold text-moss underline"
        >
          Browse all products
        </Link>
      </main>
    );
  const item = category.data;
  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <section className="relative overflow-hidden rounded-3xl bg-moss px-7 py-12 text-white sm:px-12">
        <img
          src={item.image?.src}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-25"
        />
        <div className="relative max-w-xl">
          <p className="text-xs font-bold uppercase tracking-widest text-white/65">
            Collection
          </p>
          <h1 className="mt-3 font-display text-5xl font-bold">{item.name}</h1>
          {item.description && (
            <SafeHtml
              html={item.description}
              className="mt-4 text-sm leading-7 text-white/80"
            />
          )}
        </div>
      </section>
      <section className="mt-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-ink/60">
            {products.data
              ? `${products.data.total} products`
              : "Loading products..."}
          </p>
          <select
            value={orderby}
            onChange={(event) => {
              setParams((current) => {
                current.set("orderby", event.target.value);
                current.delete("page");
                return current;
              });
            }}
            className="rounded-xl border border-ink/10 bg-white px-3 py-2.5 text-sm"
          >
            <option value="date">Newest</option>
            <option value="popularity">Popularity</option>
            <option value="rating">Top rated</option>
            <option value="price">Price: low to high</option>
            <option value="title">Name: A–Z</option>
          </select>
        </div>
        {products.isError ? (
          <ErrorState
            message={products.error.message}
            onRetry={() => products.refetch()}
          />
        ) : products.isLoading ? (
          <ProductGridSkeleton count={8} />
        ) : products.data?.items.length ? (
          <>
            <ProductGrid products={products.data.items} />
            <CategoryPagination
              page={page}
              total={products.data.totalPages}
              setPage={setPage}
            />
          </>
        ) : (
          <div className="rounded-2xl bg-white p-12 text-center text-sm text-ink/60">
            There are no products in this collection yet.
          </div>
        )}
      </section>
    </main>
  );
}
function CategoryPagination({
  page,
  total,
  setPage,
}: {
  page: number;
  total: number;
  setPage: (page: number) => void;
}) {
  if (total < 2) return null;
  return (
    <nav
      className="mt-10 flex justify-center gap-2"
      aria-label="Collection pages"
    >
      {Array.from({ length: Math.min(total, 7) }, (_, index) => index + 1).map(
        (value) => (
          <button
            key={value}
            onClick={() => setPage(value)}
            aria-current={value === page ? "page" : undefined}
            className={`grid h-10 w-10 place-items-center rounded-full text-sm font-bold ${value === page ? "bg-moss text-white" : "bg-white hover:bg-sand"}`}
          >
            {value}
          </button>
        ),
      )}
    </nav>
  );
}
