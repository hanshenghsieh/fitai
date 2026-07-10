import GoalsSettingsView from '@/components/betterbit-v2/settings/subpages/GoalsSettingsView'
import { requireSettingsBundle } from '@/lib/app/require-settings-bundle'

export const dynamic = 'force-dynamic'

export default async function GoalsSettingsPage() {
  const bundle = await requireSettingsBundle()
  return <GoalsSettingsView initial={bundle} />
}
