import LanguageSettingsView from '@/components/betterbit-v2/settings/subpages/LanguageSettingsView'
import { requireSettingsBundle } from '@/lib/app/require-settings-bundle'

export const dynamic = 'force-dynamic'

export default async function LanguageSettingsPage() {
  const bundle = await requireSettingsBundle()
  return <LanguageSettingsView initial={bundle} />
}
