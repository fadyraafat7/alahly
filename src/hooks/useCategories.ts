import { useQuery } from "@tanstack/react-query";
import { categoriesQuery, categoryQuery } from "../query/catalog";
export const useCategories = () => useQuery(categoriesQuery());
export const useCategory = (slug: string) =>
  useQuery({ ...categoryQuery(slug), enabled: Boolean(slug) });
