/** App version for About / Settings display */

export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION?.trim() || '0.1.0'

export function formatAppVersionLabel(version = APP_VERSION): string {
  return version.startsWith('v') ? version : `v${version}`
}

export function formatAppVersionWithBuild(version = APP_VERSION, build?: string | number | null): string {
  const label = formatAppVersionLabel(version)
  const buildStr =
    build != null && String(build).trim() !== ''
      ? String(build).trim()
      : process.env.NEXT_PUBLIC_APP_BUILD?.trim()
  return buildStr ? `${label} (${buildStr})` : label
}
