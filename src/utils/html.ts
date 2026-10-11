import sanitizeHtml from 'sanitize-html'
// Identical parser and policy in Node and the browser prevents hydration differences.
export function safeHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img'],
    allowedAttributes: { ...sanitizeHtml.defaults.allowedAttributes, '*': ['class'], img: ['src', 'alt', 'width', 'height', 'loading'] },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  })
}
export function plainText(html: string) { return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, ' ').trim() }
