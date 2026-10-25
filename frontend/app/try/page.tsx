import type { Metadata } from 'next'
import { Canvas } from '@/components/canvas/Canvas'
import { UserMenu } from '@/components/auth/UserMenu'

export const metadata: Metadata = {
  title: 'Try it free, no sign-up',
  description: 'Sketch a learning roadmap right in your browser. Nothing to install and no account needed; it saves on this device.',
  alternates: { canonical: '/try' },
}

// Anonymous, local-first canvas (what `/` used to be). Open to everyone.
export default function TryPage() {
  return (
    <main className="relative flex flex-col flex-1 h-full overflow-hidden">
      <div className="absolute right-4 top-4 z-30">
        <UserMenu />
      </div>
      <Canvas />
    </main>
  )
}
