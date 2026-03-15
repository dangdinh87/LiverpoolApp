/** HTML-safe JSON serialization — escapes </script> injection vectors */
function safeJsonStringify(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

/**
 * Server component that injects JSON-LD structured data into page <head>.
 * Accepts a single schema object or an array of schemas.
 * Used by all pages to add per-page structured data (BreadcrumbList, NewsArticle, etc.)
 */
export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonStringify(data) }}
    />
  );
}
