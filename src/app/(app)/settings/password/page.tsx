import ChangePasswordView from '@/components/betterbit-v2/settings/subpages/ChangePasswordView'
import { requireSettingsBundle } from '@/lib/app/require-settings-bundle'

export const dynamic = 'force-dynamic'

export default async function PasswordSettingsPage() {
  const bundle = await requireSettingsBundle()
  return <ChangePasswordView initial={bundle} />
}
