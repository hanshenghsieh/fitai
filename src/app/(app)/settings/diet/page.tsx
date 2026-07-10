'use client'

import DietPreferencesSettingsView from '@/components/betterbit-v2/settings/subpages/DietPreferencesSettingsView'
import SettingsSubpageClient from '@/features/settings/SettingsSubpageClient'

export default function DietSettingsPage() {
  return (
    <SettingsSubpageClient>
      {bundle => <DietPreferencesSettingsView initial={bundle} />}
    </SettingsSubpageClient>
  )
}
