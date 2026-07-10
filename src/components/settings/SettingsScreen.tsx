'use client'

import type { AccessStatus } from '@/lib/subscription-access'
import SettingsV2Screen from '@/components/betterbit-v2/settings/SettingsV2Screen'

interface Props {
  access: AccessStatus
  appVersion?: string
}

export default function SettingsScreen({ access, appVersion }: Props) {
  return <SettingsV2Screen access={access} appVersion={appVersion} />
}
