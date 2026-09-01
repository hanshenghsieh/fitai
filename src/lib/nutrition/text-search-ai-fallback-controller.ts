/**
 * Cost/cancellation state machine for the text-search AI fallback.
 *
 * Framework-free by design: TodayFoodMore only needs to call trigger()/reset()
 * from event handlers and subscribe() for re-renders. Keeping the actual
 * request lifecycle rules here (not scattered across useState/useEffect)
 * makes the safety-critical invariants unit testable:
 *   - AI is only ever invoked by an explicit trigger() call, never a timer
 *     or a render — callers must wire trigger() to Enter/submit only.
 *   - at most one in-flight request at a time (a second trigger() while
 *     loading is a no-op, not a queued/parallel call).
 *   - a stale response (query changed / reset() called before it resolved)
 *     is discarded, never allowed to overwrite a newer phase.
 *   - failure is terminal for that trigger — no internal retry/loop.
 */
import type { SearchV2Candidate } from '@/lib/nutrition/search-v2/types'

export type AiFallbackOutcome = 'trusted_db' | 'ai_fallback'

export type AiFallbackPhase =
  | { status: 'idle' }
  | { status: 'loading'; query: string }
  | { status: 'success'; query: string; candidate: SearchV2Candidate; outcome: AiFallbackOutcome }
  | { status: 'failed'; query: string; reason: string }

export type AiFallbackResolution =
  | { success: true; outcome: AiFallbackOutcome; candidate: SearchV2Candidate }
  | { success: false; reason: string }

export type AiFallbackResolver = (query: string, signal: AbortSignal) => Promise<AiFallbackResolution>

export class TextSearchAiFallbackController {
  private phase: AiFallbackPhase = { status: 'idle' }
  private activeController: AbortController | null = null
  private listeners = new Set<(phase: AiFallbackPhase) => void>()

  constructor(private resolver: AiFallbackResolver) {}

  getPhase(): AiFallbackPhase {
    return this.phase
  }

  subscribe(listener: (phase: AiFallbackPhase) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private setPhase(phase: AiFallbackPhase) {
    this.phase = phase
    for (const listener of this.listeners) listener(phase)
  }

  /** Cancels any in-flight request and returns to idle. Call on query edit or sheet close. */
  reset(): void {
    this.activeController?.abort()
    this.activeController = null
    this.setPhase({ status: 'idle' })
  }

  /** Intentional trigger only (Enter/submit) — never call from a keystroke/render path. */
  async trigger(query: string): Promise<void> {
    // Dedupe a repeat submit of the SAME query while it's already loading —
    // but a genuinely different query supersedes the in-flight one rather
    // than being silently dropped (a caller isn't required to reset() first).
    if (this.phase.status === 'loading' && this.phase.query === query) return

    this.activeController?.abort()
    const controller = new AbortController()
    this.activeController = controller
    this.setPhase({ status: 'loading', query })

    let resolution: AiFallbackResolution
    try {
      resolution = await this.resolver(query, controller.signal)
    } catch {
      resolution = { success: false, reason: 'network_error' }
    }

    // Stale guard: a newer trigger()/reset() replaced this request while it was in flight.
    if (this.activeController !== controller) return

    this.setPhase(
      resolution.success
        ? { status: 'success', query, candidate: resolution.candidate, outcome: resolution.outcome }
        : { status: 'failed', query, reason: resolution.reason }
    )
  }
}
