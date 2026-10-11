import { safeHtml } from "../../utils/html";
export function SafeHtml({
  html,
  className = "",
}: {
  html: string;
  className?: string;
}) {
  return (
    <div
      className={`prose-content ${className}`}
      dangerouslySetInnerHTML={{ __html: safeHtml(html) }}
    />
  );
}
