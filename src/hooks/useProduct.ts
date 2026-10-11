import { useQuery } from "@tanstack/react-query";
import { productQuery, variationsQuery } from "../query/catalog";
export const useProduct = (slug: string) =>
  useQuery({ ...productQuery(slug), enabled: Boolean(slug) });
export const useVariations = (id?: number, enabled = false) =>
  useQuery({ ...variationsQuery(id!), enabled: Boolean(id) && enabled });
