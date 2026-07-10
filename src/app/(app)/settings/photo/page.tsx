'use client'

import PhotoRecognitionSettingsView from '@/components/betterbit-v2/settings/subpages/PhotoRecognitionSettingsView'
import SettingsSubpageClient from '@/features/settings/SettingsSubpageClient'

export default function PhotoSettingsPage() {
  return (
    <SettingsSubpageClient>
      {bundle => <PhotoRecognitionSettingsView initial={bundle} />}
    </SettingsSubpageClient>
  )
}
