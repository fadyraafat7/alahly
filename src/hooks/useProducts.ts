import { useQuery } from "@tanstack/react-query";
import { getProducts } from "../api/products";
import type { ProductQuery } from "../types/product";
export const useProducts = (params: ProductQuery = {}, enabled = true) =>
  useQuery({
    queryKey: ["products", params],
    queryFn: () => getProducts(params),
    enabled,
    placeholderData: (previous) => previous,
  });
