import TurndownService from 'turndown'

let service: TurndownService | null = null

function getService(): TurndownService {
  if (!service) {
    service = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-' })
  }
  return service
}

// Best-effort reconstruction of Markdown source for questions that only
// have a stored bodyHtml — ETL-imported content never persisted the raw
// markdown (fixed going forward in content/scripts/etl.js), so the edit
// form falls back to this instead of showing a blank answer field. Lossy:
// formatting may drift slightly from the original source.
export function htmlToMarkdown(html: string): string {
  return getService().turndown(html)
}
