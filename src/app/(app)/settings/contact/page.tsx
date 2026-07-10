'use client'

import ContactSupportView from '@/components/betterbit-v2/settings/subpages/ContactSupportView'
import SettingsSubpageClient from '@/features/settings/SettingsSubpageClient'

export default function ContactSupportPage() {
  return <SettingsSubpageClient>{bundle => <ContactSupportView initial={bundle} />}</SettingsSubpageClient>
}
