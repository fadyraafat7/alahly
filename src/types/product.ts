export interface ProductImage {
  id: number;
  src: string;
  thumbnail?: string;
  name: string;
  alt: string;
}
export interface ProductTaxonomy {
  id: number;
  name: string;
  slug: string;
}
export interface ProductAttribute {
  id: number;
  name: string;
  option: string;
  options: string[];
  variation: boolean;
  visible: boolean;
}
export interface ProductVariation {
  id: number;
  price: string;
  regular_price: string;
  sale_price: string;
  stock_status: string;
  attributes: Array<{ name: string; option: string }>;
  image?: ProductImage;
}
export interface Product {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  type: "simple" | "variable" | "grouped" | "external" | string;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  stock_status: "instock" | "outofstock" | "onbackorder" | string;
  stock_quantity: number | null;
  average_rating: string;
  rating_count: number;
  images: ProductImage[];
  categories: ProductTaxonomy[];
  tags: ProductTaxonomy[];
  attributes: ProductAttribute[];
  variations: number[];
  has_options: boolean;
}
export interface ProductQuery {
  search?: string;
  slug?: string;
  category?: number;
  parent?: number;
  type?: string;
  related?: number;
  min_price?: number;
  max_price?: number;
  orderby?: "date" | "price" | "title" | "popularity" | "rating";
  order?: "asc" | "desc";
  page?: number;
  per_page?: number;
  on_sale?: boolean;
  featured?: boolean;
}
export interface ProductPage {
  items: Product[];
  total: number;
  totalPages: number;
}
