import NotificationsSettingsView from '@/components/betterbit-v2/settings/subpages/NotificationsSettingsView'
import { requireSettingsBundle } from '@/lib/app/require-settings-bundle'

export const dynamic = 'force-dynamic'

export default async function NotificationsSettingsPage() {
  const bundle = await requireSettingsBundle()
  return <NotificationsSettingsView initial={bundle} />
}
