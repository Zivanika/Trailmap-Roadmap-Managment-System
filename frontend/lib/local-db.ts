import Dexie, { type Table } from 'dexie'
import type { LocalRoadmap } from '@/types'

/**
 * Unsaved edits to a cloud roadmap, kept on this device until the server has
 * them: survives a crash, a closed tab or a failed save, and is offered back
 * when the roadmap is reopened.
 */
export interface CloudDraft {
  roadmapId: string
  nodes: LocalRoadmap['nodes']
  edges: LocalRoadmap['edges']
  /** Server version the draft was built on. */
  baseVersion: number | null
  savedAt: number
}

interface LocalBlob {
  id: string
  roadmapId: string
  blob: Blob
}

class TrailmapDB extends Dexie {
  roadmaps!: Table<LocalRoadmap>
  blobs!: Table<LocalBlob>
  cloudDrafts!: Table<CloudDraft, string>

  // So super('trailmap') is calling Dexie's own constructor, passing 'trailmap' as the database name. This tells Dexie: "create (or open) an IndexedDB database literally named trailmap" — this is the actual database file/namespace in the browser, separate from the roadmaps table name we discussed earlier.
  constructor() {
    super('trailmap')
    this.version(1).stores({
      roadmaps: 'id, updatedAt',
    })
    this.version(2).stores({
      roadmaps: 'id, updatedAt',
      blobs: 'id, roadmapId',
    })
    this.version(3).stores({
      roadmaps: 'id, updatedAt',
      blobs: 'id, roadmapId',
      cloudDrafts: 'roadmapId',
    })
  }
}

export const db = new TrailmapDB()

export async function saveRoadmap(roadmap: LocalRoadmap) {
  await db.roadmaps.put(roadmap)
}

export async function getRoadmap(id: string): Promise<LocalRoadmap | undefined> {
  return db.roadmaps.get(id)
}

export async function listRoadmaps(): Promise<LocalRoadmap[]> {
  return db.roadmaps.orderBy('updatedAt').reverse().toArray()
}

export async function deleteRoadmap(id: string) {
  await db.roadmaps.delete(id)
}

export async function deleteBlobsByRoadmap(roadmapId: string) {
  await db.blobs.where('roadmapId').equals(roadmapId).delete()
}

export async function saveCloudDraft(draft: CloudDraft) {
  await db.cloudDrafts.put(draft)
}

export async function getCloudDraft(roadmapId: string) {
  return db.cloudDrafts.get(roadmapId)
}

/** Removes the draft, but only if it's still the one that was saved (a newer edit may have replaced it). */
export async function clearCloudDraft(roadmapId: string, savedAt?: number) {
  await db.transaction('rw', db.cloudDrafts, async () => {
    const d = await db.cloudDrafts.get(roadmapId)
    if (d && (savedAt === undefined || d.savedAt === savedAt)) await db.cloudDrafts.delete(roadmapId)
  })
}
