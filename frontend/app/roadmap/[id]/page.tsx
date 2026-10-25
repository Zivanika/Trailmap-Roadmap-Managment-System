import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { RoadmapEditor } from '@/components/canvas/RoadmapEditor'

export const metadata: Metadata = {
  title: 'Editor',
  robots: { index: false, follow: false },
}

export default async function RoadmapPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  const { id } = await params
  if (!session?.user) redirect(`/login?callbackUrl=/roadmap/${id}`)
  return <RoadmapEditor id={id} />
}
