import DOMPurify from 'dompurify'
export function SafeHtml({ html, className = '' }: { html: string; className?: string }) { return <div className={`prose-content ${className}`} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} /> }
