import ContactSupportView from '@/components/betterbit-v2/settings/subpages/ContactSupportView'
import { requireSettingsBundle } from '@/lib/app/require-settings-bundle'

export const dynamic = 'force-dynamic'

export default async function ContactSupportPage() {
  const bundle = await requireSettingsBundle()
  return <ContactSupportView initial={bundle} />
}
