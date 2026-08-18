import { isVersionAtLeast, isVersionBelow } from '@/lib/version-compare'

/**
 * Pure decision layer for the in-app update announcement — no network, no
 * platform calls, fully deterministic given a config + the installed
 * version. Kept separate from the fetch/App.getInfo() side effects (see
 * use-app-update-check.ts) so the decision rule itself is trivially testable
 * and so "fail open on a bad/missing config" is enforced in exactly one
 * place, not re-implemented at every call site.
 */
export type UpdateDecisionKind = 'none' | 'optional' | 'required'

export interface UpdateDecision {
  kind: UpdateDecisionKind
  title?: string
  message?: string
  updateUrl?: string
}

export interface ReleaseConfig {
  latest_version: string
  minimum_version: string
  title: string
  message: string
  update_url: string
  force_update: boolean
  enabled: boolean
}

const NONE_DECISION: UpdateDecision = { kind: 'none' }

/**
 * Validates the shape actually required to make a safe decision. Anything
 * short of this (missing fields, wrong types, non-JSON, network error
 * upstream) must resolve to "none" — a broken/unreachable config can never
 * turn into a force-update lock. This is the single fail-open gate for the
 * whole feature.
 */
export function isValidReleaseConfig(value: unknown): value is ReleaseConfig {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.latest_version === 'string' &&
    v.latest_version.trim() !== '' &&
    typeof v.minimum_version === 'string' &&
    v.minimum_version.trim() !== '' &&
    typeof v.title === 'string' &&
    typeof v.message === 'string' &&
    typeof v.update_url === 'string' &&
    typeof v.force_update === 'boolean' &&
    typeof v.enabled === 'boolean'
  )
}

/**
 * `installedVersion` must be the REAL native version (from App.getInfo()),
 * not a build-time fallback — callers are responsible for that; this
 * function only encodes the comparison rule, matching the task spec exactly:
 *   installed >= latest        -> none
 *   installed <  minimum       -> required (unless force_update is off)
 *   otherwise                  -> optional
 */
export function decideUpdate(config: unknown, installedVersion: string): UpdateDecision {
  if (!isValidReleaseConfig(config)) return NONE_DECISION
  if (!config.enabled) return NONE_DECISION
  if (!installedVersion || typeof installedVersion !== 'string') return NONE_DECISION

  if (isVersionAtLeast(installedVersion, config.latest_version)) return NONE_DECISION

  if (config.force_update && isVersionBelow(installedVersion, config.minimum_version)) {
    return {
      kind: 'required',
      title: config.title,
      message: config.message,
      updateUrl: config.update_url,
    }
  }

  return {
    kind: 'optional',
    title: config.title,
    message: config.message,
    updateUrl: config.update_url,
  }
}
