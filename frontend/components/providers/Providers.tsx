'use client'

import { useState } from 'react'
import { SessionProvider } from 'next-auth/react'
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/Toaster'
import { toast } from '@/store/toast-store'
import { ApiError } from '@/lib/api-client'
import { AnalyticsProvider } from '@/components/providers/AnalyticsProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        // Rename, delete, duplicate, share… used to fail silently. A mutation
        // that shows its own error inline opts out with meta: { quiet: true }.
        mutationCache: new MutationCache({
          onError: (err, _vars, _ctx, mutation) => {
            if (mutation.meta?.quiet) return
            toast.error(err instanceof ApiError && err.message ? err.message : 'Something went wrong. Please try again.')
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: true,
            retry: 1,
          },
        },
      }),
  )

  return (
    <SessionProvider>
      <AnalyticsProvider />
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster />
      </QueryClientProvider>
    </SessionProvider>
  )
}
