import InterfaceSettingsView from '@/components/betterbit-v2/settings/subpages/InterfaceSettingsView'
import { requireSettingsBundle } from '@/lib/app/require-settings-bundle'

export const dynamic = 'force-dynamic'

export default async function InterfaceSettingsPage() {
  const bundle = await requireSettingsBundle()
  return <InterfaceSettingsView initial={bundle} />
}
