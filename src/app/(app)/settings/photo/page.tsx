import PhotoRecognitionSettingsView from '@/components/betterbit-v2/settings/subpages/PhotoRecognitionSettingsView'
import { requireSettingsBundle } from '@/lib/app/require-settings-bundle'

export const dynamic = 'force-dynamic'

export default async function PhotoSettingsPage() {
  const bundle = await requireSettingsBundle()
  return <PhotoRecognitionSettingsView initial={bundle} />
}
