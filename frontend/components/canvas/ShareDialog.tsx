'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Copy, Globe, Link2, Loader2, Lock, X } from 'lucide-react'
import { useUpdateRoadmap } from '@/hooks/use-roadmaps'
import type { RoadmapSummary, Visibility } from '@/lib/api-client'
import { cn } from '@/lib/utils'

const OPTIONS: { value: Visibility; icon: typeof Lock; label: string; hint: string }[] = [
  { value: 'private', icon: Lock, label: 'Private', hint: 'Only you can open it.' },
  { value: 'unlisted', icon: Link2, label: 'Unlisted', hint: 'Anyone with the link can view it. Not listed or searchable.' },
  { value: 'public', icon: Globe, label: 'Public', hint: 'Listed on Explore and findable in search engines.' },
]

export const VISIBILITY_META: Record<Visibility, { icon: typeof Lock; label: string }> = {
  private: { icon: Lock, label: 'Private' },
  unlisted: { icon: Link2, label: 'Unlisted' },
  public: { icon: Globe, label: 'Public' },
}

const MAX_TAGS = 8

/** Lowercase and trim a typed tag, keeping letters, digits, spaces, dashes and a few symbols (c++, c#, .net). */
function cleanTag(raw: string) {
  return raw.trim().toLowerCase().replace(/^#/, '').replace(/[^\p{L}\p{N} +#.-]/gu, '').replace(/\s+/g, ' ').slice(0, 30)
}

type ShareableRoadmap = Pick<RoadmapSummary, 'id' | 'title' | 'visibility' | 'shareSlug' | 'description' | 'tags' | 'isTemplate' | 'canFeature'>

/**
 * Choose who can see a roadmap. Nothing changes until "Save", so picking an
 * option by accident can't publish anything.
 */
export function ShareDialog({ roadmap, onClose }: { roadmap: ShareableRoadmap; onClose: () => void }) {
  const update = useUpdateRoadmap({ quiet: true })
  const [visibility, setVisibility] = useState<Visibility>(roadmap.visibility)
  const [description, setDescription] = useState(roadmap.description ?? '')
  const [tags, setTags] = useState<string[]>(roadmap.tags ?? [])
  const [featured, setFeatured] = useState(Boolean(roadmap.isTemplate))
  const [tagInput, setTagInput] = useState('')
  // The saved state, which the link and "Stop sharing" reflect (not the unsaved choice).
  const [saved, setSaved] = useState({
    visibility: roadmap.visibility,
    shareSlug: roadmap.shareSlug,
    description: roadmap.description ?? '',
    tags: roadmap.tags ?? [],
    featured: Boolean(roadmap.isTemplate),
  })
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const shareUrl =
    saved.visibility !== 'private' && saved.shareSlug && typeof window !== 'undefined'
      ? `${window.location.origin}/r/${saved.shareSlug}`
      : null
  const dirty =
    visibility !== saved.visibility ||
    description.trim() !== saved.description ||
    tags.join(',') !== saved.tags.join(',') ||
    cleanTag(tagInput) !== '' ||
    (visibility === 'public' && featured !== saved.featured)

  /** Adds one or more comma-separated tags (typed or pasted). */
  function addTag(raw: string) {
    const next = [...tags]
    for (const part of raw.split(',')) {
      const tag = cleanTag(part)
      if (tag && !next.includes(tag) && next.length < MAX_TAGS) next.push(tag)
    }
    setTags(next)
    setTagInput('')
  }

  function onTagInput(value: string) {
    // A comma ends a tag; whatever follows the last comma is still being typed.
    const cut = value.lastIndexOf(',')
    if (cut === -1) return setTagInput(value)
    addTag(value.slice(0, cut))
    setTagInput(value.slice(cut + 1).trimStart())
  }

  async function save(next: Visibility = visibility) {
    setError(null)
    try {
      // A tag still being typed when Save is pressed counts too.
      const pendingTag = cleanTag(tagInput)
      const finalTags = pendingTag && !tags.includes(pendingTag) ? [...tags, pendingTag].slice(0, MAX_TAGS) : tags
      const { roadmap: updated } = await update.mutateAsync({
        id: roadmap.id,
        patch: {
          visibility: next,
          description: description.trim(),
          tags: finalTags,
          // Only admins see the option; the gallery only lists public roadmaps.
          ...(roadmap.canFeature ? { isTemplate: next === 'public' && featured } : {}),
        },
      })
      setTags(finalTags)
      setFeatured(Boolean(updated.isTemplate))
      setTagInput('')
      setVisibility(updated.visibility)
      setDescription(updated.description ?? '')
      setSaved({
        visibility: updated.visibility,
        shareSlug: updated.shareSlug,
        description: updated.description ?? '',
        tags: updated.tags,
        featured: Boolean(updated.isTemplate),
      })
    } catch {
      setError('Couldn’t save sharing settings. Please try again.')
    }
  }

  async function copy() {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard blocked (e.g. insecure context): select the text so it can be copied by hand.
      ;(document.getElementById('share-url') as HTMLInputElement | null)?.select()
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" onMouseDown={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in-0 duration-200" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-title"
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0b1a12] shadow-2xl animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
          <h3 id="share-title" className="min-w-0 truncate text-sm font-semibold text-white">
            Share “{roadmap.title}”
          </h3>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-white/40 hover:bg-white/10 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[75vh] space-y-4 overflow-y-auto p-5">
          <fieldset className="space-y-2">
            <legend className="mb-2 text-xs font-medium text-white/60">Who can see it</legend>
            {OPTIONS.map((o) => (
              <label
                key={o.value}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition-colors',
                  visibility === o.value
                    ? 'border-emerald-400/50 bg-emerald-400/10'
                    : 'border-white/10 hover:border-white/20 hover:bg-white/[0.03]',
                )}
              >
                <input
                  type="radio"
                  name="visibility"
                  value={o.value}
                  checked={visibility === o.value}
                  onChange={() => setVisibility(o.value)}
                  className="sr-only"
                />
                <o.icon size={16} className={cn('mt-0.5 shrink-0', visibility === o.value ? 'text-emerald-300' : 'text-white/50')} />
                <span>
                  <span className="block text-sm font-medium text-white">{o.label}</span>
                  <span className="block text-xs text-white/50">{o.hint}</span>
                </span>
              </label>
            ))}
          </fieldset>

          {/* What Explore shows; only relevant when it's listed there. */}
          {visibility === 'public' && (
            <div className="space-y-3">
              <div>
                <label htmlFor="share-description" className="mb-1.5 block text-xs font-medium text-white/60">
                  Description <span className="text-white/35">(shown on Explore)</span>
                </label>
                <textarea
                  id="share-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  maxLength={300}
                  placeholder="What will someone learn by following this?"
                  className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-emerald-400/40 focus:outline-none"
                />
              </div>
              <div>
                <label htmlFor="share-tags" className="mb-1.5 block text-xs font-medium text-white/60">
                  Tags <span className="text-white/35">(up to {MAX_TAGS}, help people find it)</span>
                </label>
                <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 focus-within:border-emerald-400/40">
                  {tags.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-xs text-emerald-200">
                      #{t}
                      <button onClick={() => setTags(tags.filter((x) => x !== t))} aria-label={`Remove tag ${t}`} className="text-emerald-200/60 hover:text-white">
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                  {tags.length < MAX_TAGS && (
                    <input
                      id="share-tags"
                      value={tagInput}
                      onChange={(e) => onTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addTag(tagInput)
                        } else if (e.key === 'Backspace' && !tagInput && tags.length) {
                          setTags(tags.slice(0, -1))
                        }
                      }}
                      onBlur={() => tagInput && addTag(tagInput)}
                      placeholder={tags.length ? '' : 'e.g. react, web, career'}
                      className="min-w-24 flex-1 bg-transparent py-0.5 text-sm text-white placeholder:text-white/30 focus:outline-none"
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {visibility === 'public' && roadmap.canFeature && (
            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] px-3 py-2.5">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="mt-0.5 accent-amber-400"
              />
              <span>
                <span className="block text-sm font-medium text-white">Feature in the template gallery</span>
                <span className="block text-xs text-white/50">Admins only. Shown under Templates on Explore and when starting a new roadmap.</span>
              </span>
            </label>
          )}

          {shareUrl && (
            <div>
              <label htmlFor="share-url" className="mb-1.5 block text-xs font-medium text-white/60">
                Link
              </label>
              <div className="flex gap-2">
                <input
                  id="share-url"
                  readOnly
                  value={shareUrl}
                  onFocus={(e) => e.target.select()}
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80 focus:outline-none"
                />
                <button
                  onClick={copy}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white hover:bg-white/20"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-white/10 px-5 py-3.5">
          {saved.visibility !== 'private' ? (
            <button
              onClick={() => save('private')}
              disabled={update.isPending}
              className="text-xs font-medium text-red-300/80 hover:text-red-300 disabled:opacity-50"
              title="The link stops working. Sharing again brings the same link back."
            >
              Stop sharing
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/5">
              {dirty ? 'Cancel' : 'Done'}
            </button>
            <button
              onClick={() => save()}
              disabled={!dirty || update.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {update.isPending && <Loader2 size={14} className="animate-spin" />}
              {visibility !== 'private' && saved.visibility === 'private' ? 'Share' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
