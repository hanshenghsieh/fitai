'use client'

import DietPreferencesSettingsView from '@/components/betterbit-v2/settings/subpages/DietPreferencesSettingsView'
import SettingsSubpageClient from '@/features/settings/SettingsSubpageClient'

export default function DietSettingsPage() {
  return (
    <SettingsSubpageClient>
      {bundle => (
        <DietPreferencesSettingsView
          key={[
            bundle.profile.updated_at ?? '',
            ...(bundle.preferences.diet_extras?.diet_restrictions ?? []),
            ...(bundle.profile.allergens ?? []),
          ].join('|')}
          initial={bundle}
        />
      )}
    </SettingsSubpageClient>
  )
}
