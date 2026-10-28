'use client'

import { useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { identifyUser, initAnalytics, resetAnalytics } from '@/lib/analytics'

// Initializes Mixpanel once on the client and keeps the identified user in sync
// with the NextAuth session. Pageviews/clicks come from autocapture (see
// lib/analytics.ts); this component only owns init + identity.
export function AnalyticsProvider() {
  const { data: session, status } = useSession()
  const identified = useRef(false)

  useEffect(() => {
    initAnalytics()
  }, [])

  useEffect(() => {
    if (status === 'loading') return

    if (session?.user?.id) {
      identifyUser({
        id: session.user.id,
        email: session.user.email,
        plan: session.user.plan,
      })
      identified.current = true
    } else if (identified.current) {
      // Signed out after having been signed in — don't merge the next user.
      resetAnalytics()
      identified.current = false
    }
  }, [status, session?.user?.id, session?.user?.email, session?.user?.plan])

  return null
}
