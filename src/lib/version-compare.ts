/**
 * Numeric, per-segment version comparison — never a raw string comparison
 * ("1.10.0" > "1.9.0" is false as strings, true as versions; this must get
 * that right). Not a full semver implementation (no pre-release/build
 * metadata handling) — BetterBit's actual version strings (MARKETING_VERSION
 * in the Xcode project) are plain X.Y.Z, and this only needs to compare
 * those correctly. Missing segments are treated as 0 ("1.0" == "1.0.0"), and
 * a non-numeric segment falls back to 0 rather than throwing — malformed
 * input must never crash the update-check flow (see decide-update.ts, which
 * relies on this never throwing).
 */
export type VersionComparison = -1 | 0 | 1

function toSegments(version: string): number[] {
  return version
    .trim()
    .split('.')
    .map(part => {
      const n = parseInt(part, 10)
      return Number.isFinite(n) && n >= 0 ? n : 0
    })
}

export function compareVersions(a: string, b: string): VersionComparison {
  const segA = toSegments(a)
  const segB = toSegments(b)
  const length = Math.max(segA.length, segB.length)
  for (let i = 0; i < length; i++) {
    const partA = segA[i] ?? 0
    const partB = segB[i] ?? 0
    if (partA > partB) return 1
    if (partA < partB) return -1
  }
  return 0
}

export function isVersionAtLeast(installed: string, target: string): boolean {
  return compareVersions(installed, target) >= 0
}

export function isVersionBelow(installed: string, target: string): boolean {
  return compareVersions(installed, target) < 0
}
