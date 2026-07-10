'use client'

import AboutBetterBitView from '@/components/betterbit-v2/settings/subpages/AboutBetterBitView'
import packageJson from '../../../../../package.json'

export default function AboutSettingsPage() {
  return <AboutBetterBitView appVersion={packageJson.version} />
}
