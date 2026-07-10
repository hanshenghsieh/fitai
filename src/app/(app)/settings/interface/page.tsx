'use client'

import InterfaceSettingsView from '@/components/betterbit-v2/settings/subpages/InterfaceSettingsView'
import SettingsSubpageClient from '@/features/settings/SettingsSubpageClient'

export default function InterfaceSettingsPage() {
  return (
    <SettingsSubpageClient>
      {bundle => <InterfaceSettingsView initial={bundle} />}
    </SettingsSubpageClient>
  )
}
