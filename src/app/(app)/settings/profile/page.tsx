import ProfileSettingsView from '@/components/betterbit-v2/settings/subpages/ProfileSettingsView'
import { requireSettingsBundle } from '@/lib/app/require-settings-bundle'

export const dynamic = 'force-dynamic'

export default async function ProfileSettingsPage() {
  const bundle = await requireSettingsBundle()
  return <ProfileSettingsView initial={bundle} />
}
