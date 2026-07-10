import BodyDataSettingsView from '@/components/betterbit-v2/settings/subpages/BodyDataSettingsView'
import { requireSettingsBundle } from '@/lib/app/require-settings-bundle'

export const dynamic = 'force-dynamic'

export default async function BodyDataSettingsPage() {
  const bundle = await requireSettingsBundle()
  return <BodyDataSettingsView initial={bundle} />
}
