'use client'

import ChangePasswordView from '@/components/betterbit-v2/settings/subpages/ChangePasswordView'
import SettingsSubpageClient from '@/features/settings/SettingsSubpageClient'

export default function PasswordSettingsPage() {
  return <SettingsSubpageClient>{bundle => <ChangePasswordView initial={bundle} />}</SettingsSubpageClient>
}
