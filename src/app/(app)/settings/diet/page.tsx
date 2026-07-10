import DietPreferencesSettingsView from '@/components/betterbit-v2/settings/subpages/DietPreferencesSettingsView'
import { requireSettingsBundle } from '@/lib/app/require-settings-bundle'

export const dynamic = 'force-dynamic'

export default async function DietSettingsPage() {
  const bundle = await requireSettingsBundle()
  return <DietPreferencesSettingsView initial={bundle} />
}
