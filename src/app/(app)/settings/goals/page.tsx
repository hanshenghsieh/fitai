'use client'

import GoalsSettingsView from '@/components/betterbit-v2/settings/subpages/GoalsSettingsView'
import SettingsSubpageClient from '@/features/settings/SettingsSubpageClient'

export default function GoalsSettingsPage() {
  return <SettingsSubpageClient>{bundle => <GoalsSettingsView initial={bundle} />}</SettingsSubpageClient>
}
