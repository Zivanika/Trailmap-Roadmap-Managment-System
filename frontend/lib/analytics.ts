import mixpanel, { type Dict } from 'mixpanel-browser'

// Client-side Mixpanel wrapper. The token is a public, browser-safe key
// (NEXT_PUBLIC_*). All calls are no-ops when the token is missing (e.g. local
// dev without analytics configured) so nothing here can throw in the UI.

const TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN

let started = false

export function initAnalytics() {
  if (started || !TOKEN || typeof window === 'undefined') return
  mixpanel.init(TOKEN, {
    // Capture pageviews + clicks/inputs automatically; we still send explicit
    // events for the things we care about.
    autocapture: true,
    // Respect Do Not Track and avoid writing cookies we don't need.
    persistence: 'localStorage',
    ignore_dnt: false,
  })
  started = true
}

/** Tie subsequent events to a known user and set their profile properties. */
export function identifyUser(user: { id: string; email?: string | null; plan?: string | null }) {
  if (!started) return
  mixpanel.identify(user.id)
  mixpanel.people.set({
    ...(user.email ? { $email: user.email } : {}),
    ...(user.plan ? { plan: user.plan } : {}),
  })
}

/** Clear identity on sign-out so the next user isn't merged into this one. */
export function resetAnalytics() {
  if (!started) return
  mixpanel.reset()
}

export function track(event: string, properties?: Dict) {
  if (!started) return
  mixpanel.track(event, properties)
}
