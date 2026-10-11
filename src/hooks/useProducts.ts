import { useQuery } from "@tanstack/react-query";
import { productsQuery } from "../query/catalog";
import type { ProductQuery } from "../types/product";
export const useProducts = (params: ProductQuery = {}, enabled = true) =>
  useQuery({
    ...productsQuery(params),
    enabled,
    placeholderData: (previous) => previous,
  });
