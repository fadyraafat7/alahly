export interface Seo {
  title: string;
  description: string;
  canonical: string;
  noindex?: boolean;
}
export function catalogMeta(seo?: Seo) {
  if (!seo)
    return [
      { title: "Store unavailable | Alahly" },
      { name: "robots", content: "noindex" },
    ];
  return [
    { title: seo.title },
    { name: "description", content: seo.description },
    { tagName: "link" as const, rel: "canonical", href: seo.canonical },
    ...(seo.noindex ? [{ name: "robots", content: "noindex,follow" }] : []),
  ];
}
export const privateMeta = (title: string) => [
  { title: `${title} | Alahly` },
  { name: "robots", content: "noindex,nofollow" },
];
