'use client'

import ProfileSettingsView from '@/components/betterbit-v2/settings/subpages/ProfileSettingsView'
import SettingsSubpageClient from '@/features/settings/SettingsSubpageClient'

export default function ProfileSettingsPage() {
  return <SettingsSubpageClient>{bundle => <ProfileSettingsView initial={bundle} />}</SettingsSubpageClient>
}
