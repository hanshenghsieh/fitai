'use client'

import LanguageSettingsView from '@/components/betterbit-v2/settings/subpages/LanguageSettingsView'
import SettingsSubpageClient from '@/features/settings/SettingsSubpageClient'

export default function LanguageSettingsPage() {
  return (
    <SettingsSubpageClient>
      {bundle => <LanguageSettingsView initial={bundle} />}
    </SettingsSubpageClient>
  )
}
