'use client'

import NotificationsSettingsView from '@/components/betterbit-v2/settings/subpages/NotificationsSettingsView'
import SettingsSubpageClient from '@/features/settings/SettingsSubpageClient'

export default function NotificationsSettingsPage() {
  return (
    <SettingsSubpageClient>
      {bundle => <NotificationsSettingsView initial={bundle} />}
    </SettingsSubpageClient>
  )
}
