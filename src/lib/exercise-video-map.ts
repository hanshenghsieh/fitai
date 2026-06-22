/**
 * Exercise demo videos — only entries with verified=true are shown in UI.
 * Fill in video_url manually after human review.
 */

export interface ExerciseVideoEntry {
  exercise_id: string
  name: string
  video_url: string | null
  verified: boolean
  source: string | null
  updated_at: string | null
}

/** Populated manually; unknown exercises fall back to gentle placeholder copy. */
export const EXERCISE_VIDEO_MAP: Record<string, ExerciseVideoEntry> = {}

export function getVerifiedExerciseVideo(exerciseId: string): ExerciseVideoEntry | null {
  const entry = EXERCISE_VIDEO_MAP[exerciseId]
  if (!entry?.verified || !entry.video_url) return null
  return entry
}

export function exerciseVideoPlaceholder(name: string): string {
  return `${name} · 影片整理中，先照文字做就好`
}
