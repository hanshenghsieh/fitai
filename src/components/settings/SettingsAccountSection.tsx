import { useRouter } from 'next/navigation'
import { Loader2, LogOut } from 'lucide-react'
import { colors } from '@/lib/design-system'
import { signOut } from '@/lib/auth/auth-service'
import SettingsSection from './SettingsSection'
import SettingsRow from './SettingsRow'

interface Props {
  email: string
  onRegenPlan: () => void
  regenLoading: boolean
}

export default function SettingsAccountSection({
  email,
  onRegenPlan,
  regenLoading,
}: Props) {
  const router = useRouter()

  async function handleLogout() {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <SettingsSection title="帳號">
      <SettingsRow label="Email" value={email} />
      <SettingsRow
        label="重排本週計畫"
        detail="生活變了？我們重新幫你排。"
        onClick={onRegenPlan}
        trailing={regenLoading ? <Loader2 className="h-4 w-4 animate-spin" style={{ color: colors.text.tertiary }} /> : undefined}
      />
      <SettingsRow
        label="登出"
        onClick={() => void handleLogout()}
        trailing={<LogOut className="h-4 w-4" style={{ color: colors.text.tertiary }} />}
        last
      />
    </SettingsSection>
  )
}
