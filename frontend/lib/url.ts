const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:'])

/** What the user typed into a URL field, with `https://` added when no scheme was given. */
export function normalizeUrl(input: string): string {
  const url = input.trim()
  if (!url || /^[a-z][a-z0-9+.-]*:/i.test(url)) return url
  return `https://${url.replace(/^\/+/, '')}`
}

/**
 * An href for a stored URL, or undefined when it isn't http(s)/mailto. Block
 * URLs are user content shown on public pages, so a `javascript:` link must
 * never become clickable.
 */
export function safeHref(url: string | undefined): string | undefined {
  if (!url) return undefined
  try {
    return SAFE_PROTOCOLS.has(new URL(url).protocol) ? url : undefined
  } catch {
    return undefined
  }
}

/** Where to search for an AI resource idea: YouTube for videos, the web for the rest. */
export function resourceSearchUrl(kind: string, query: string) {
  return kind === 'video'
    ? `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
    : `https://www.google.com/search?q=${encodeURIComponent(query)}`
}
