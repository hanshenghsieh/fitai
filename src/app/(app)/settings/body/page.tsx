'use client'

import BodyDataSettingsView from '@/components/betterbit-v2/settings/subpages/BodyDataSettingsView'
import SettingsSubpageClient from '@/features/settings/SettingsSubpageClient'

export default function BodyDataSettingsPage() {
  return <SettingsSubpageClient>{bundle => <BodyDataSettingsView initial={bundle} />}</SettingsSubpageClient>
}
