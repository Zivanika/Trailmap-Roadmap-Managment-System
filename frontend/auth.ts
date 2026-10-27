import NextAuth, { type NextAuthConfig } from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import { backendFetch } from '@/lib/backend'

/**
 * NextAuth v5 — JWT (stateless) mode.
 *
 * No database adapter → no sessions table (per architecture: "no Redis, no
 * sessions table"). The session lives entirely in a signed, httpOnly JWT cookie.
 * The backend (Express) verifies the same token using the shared AUTH_SECRET.
 *
 * Providers:
 *  - Google OAuth (reads AUTH_GOOGLE_ID/SECRET, falling back to CLIENT_ID/SECRET)
 *  - Email magic links: the backend emails a one-time link (via Brevo) and
 *    redeems it; this provider just exchanges the token for the email. It's
 *    Credentials-based because NextAuth's Email provider needs a database adapter.
 *  - A dev-only Credentials stub so auth flows can be tested without real keys.
 *    It is excluded entirely from production builds.
 */

const isDev = process.env.NODE_ENV === 'development'

const providers: NextAuthConfig['providers'] = [
  Google({
    clientId: process.env.AUTH_GOOGLE_ID ?? process.env.CLIENT_ID,
    clientSecret: process.env.AUTH_GOOGLE_SECRET ?? process.env.CLIENT_SECRET,
  }),
  Credentials({
    id: 'magic-link',
    name: 'Email link',
    credentials: { token: { type: 'text' } },
    authorize: async (creds) => {
      const token = typeof creds?.token === 'string' ? creds.token : ''
      if (!token) return null
      // Server to server, on nobody's behalf: the token itself is the secret.
      const res = await backendFetch(
        '/api/auth/magic-link/verify',
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }), cache: 'no-store' },
        { clientIp: null },
      )
      if (!res.ok) return null
      const { email } = (await res.json()) as { email?: string }
      return email ? { id: email, email, name: email.split('@')[0] } : null
    },
  }),
]

if (isDev) {
  providers.push(
    Credentials({
      id: 'dev',
      name: 'Dev login',
      credentials: {
        email: { label: 'Email', type: 'email' },
      },
      // Dev stub: accepts any email, returns a stable fake user. Never shipped to prod.
      authorize: (creds) => {
        const email = typeof creds?.email === 'string' && creds.email ? creds.email : 'dev@trailmap.app'
        return { id: `dev:${email}`, email, name: email.split('@')[0] }
      },
    }),
  )
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
  },
  providers,
  callbacks: {
    // Persist identity + plan onto the JWT so the backend can authorize from it alone.
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id ?? token.sub
        token.plan = 'free'
      }
      return token
    },
    // Expose the same fields to the client/server session.
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string) ?? token.sub ?? ''
        session.user.plan = (token.plan as 'free' | 'pro') ?? 'free'
      }
      return session
    },
  },
})
