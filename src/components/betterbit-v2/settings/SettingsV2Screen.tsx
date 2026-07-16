'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  User,
  Target,
  Scale,
  Bell,
  Camera,
  UtensilsCrossed,
  Palette,
  Globe,
  Moon,
  Gift,
  CircleHelp,
  Headphones,
  Info,
} from 'lucide-react'
import type { AccessStatus } from '@/lib/subscription-access'
import { BB_V2 } from '@/lib/betterbit-v2'
import { formatAppVersionLabel } from '@/lib/app-version'
import {
  shouldBypassSubscriptionPaywallClient,
} from '@/lib/ios-payment-gate'
import V2PageEnter from '@/components/betterbit-v2/V2PageEnter'
import V2SettingsSection from '@/components/betterbit-v2/settings/V2SettingsSection'
import V2SettingsRow from '@/components/betterbit-v2/settings/V2SettingsRow'
import V2SettingsProCard from '@/components/betterbit-v2/settings/V2SettingsProCard'
import V2SettingsSwitch from '@/components/betterbit-v2/settings/V2SettingsSwitch'
import V2SettingsLogoutButton from '@/components/betterbit-v2/settings/V2SettingsLogoutButton'
import SettingsDeleteAccountSection from '@/components/settings/SettingsDeleteAccountSection'
import { apiFetch } from '@/lib/api/client'

interface Props {
  access: AccessStatus
  appVersion?: string
}


export default function SettingsV2Screen({ access, appVersion }: Props) {
  const router = useRouter()
  const [isSubscribed, setIsSubscribed] = useState(access.isSubscribed)
  const [bypassPaywall, setBypassPaywall] = useState(shouldBypassSubscriptionPaywallClient())
  const [darkMode, setDarkMode] = useState(false)
  const versionLabel = formatAppVersionLabel(appVersion)

  useEffect(() => {
    setBypassPaywall(shouldBypassSubscriptionPaywallClient())
  }, [])

  useEffect(() => {
    if (bypassPaywall || access.isSubscribed) return
    void apiFetch('/api/get-subscription')
      .then(r => (r.ok ? r.json() : null))
      .then(data => setIsSubscribed(data?.subscription?.status === 'active'))
      .catch(() => {})
  }, [bypassPaywall, access.isSubscribed])

  const proActive = bypassPaywall || isSubscribed || access.isSubscribed

  return (
    <V2PageEnter>
      <div
        className="v2-settings-page app-tab-column pb-[calc(var(--app-nav-total,72px)+28px)]"
        style={{ paddingLeft: 'var(--v2-page-px)', paddingRight: 'var(--v2-page-px)' }}
      >
        <header
          className="text-center pt-[max(12px,var(--app-safe-top,0px))] pb-5"
        >
          <h1 className="text-[18px]" style={{ color: BB_V2.text.deepGreen, fontWeight: 700 }}>
            設定
          </h1>
        </header>

        <div className="space-y-[18px]">
          <V2SettingsProCard
            subscribed={proActive}
            onClick={() => router.push('/settings/premium')}
          />

          <V2SettingsSection title="個人設定" staggerIndex={1}>
            <V2SettingsRow
              icon={<User className="h-5 w-5" strokeWidth={BB_V2.iconStroke} />}
              title="個人資料"
              subtitle="編輯你的基本資料"
              onClick={() => router.push('/settings/profile')}
            />
            <V2SettingsRow
              icon={<Target className="h-5 w-5" strokeWidth={BB_V2.iconStroke} />}
              title="目標設定"
              subtitle="調整你的減脂目標"
              onClick={() => router.push('/settings/goals')}
            />
            <V2SettingsRow
              icon={<Scale className="h-5 w-5" strokeWidth={BB_V2.iconStroke} />}
              title="身體數據"
              subtitle="管理你的身高、體重等數據"
              onClick={() => router.push('/settings/body')}
            />
            <V2SettingsRow
              icon={<Bell className="h-5 w-5" strokeWidth={BB_V2.iconStroke} />}
              title="通知設定"
              subtitle="管理提醒與通知"
              onClick={() => router.push('/settings/notifications')}
              last
            />
          </V2SettingsSection>

          <V2SettingsSection title="應用設定" staggerIndex={2}>
            <V2SettingsRow
              icon={<Camera className="h-5 w-5" strokeWidth={BB_V2.iconStroke} />}
              title="拍照辨識設定"
              subtitle="調整拍照與辨識偏好"
              onClick={() => router.push('/settings/photo')}
            />
            <V2SettingsRow
              icon={<UtensilsCrossed className="h-5 w-5" strokeWidth={BB_V2.iconStroke} />}
              title="飲食偏好"
              subtitle="設定不喜歡的食物與飲食偏好"
              onClick={() => router.push('/settings/diet')}
            />
            <V2SettingsRow
              icon={<Palette className="h-5 w-5" strokeWidth={BB_V2.iconStroke} />}
              title="介面設定"
              subtitle="調整主題與顯示偏好"
              onClick={() => router.push('/settings/interface')}
            />
            <V2SettingsRow
              icon={<Globe className="h-5 w-5" strokeWidth={BB_V2.iconStroke} />}
              title="語言設定"
              subtitle="選擇應用語言"
              value="繁體中文"
              onClick={() => router.push('/settings/language')}
            />
            <V2SettingsRow
              icon={<Moon className="h-5 w-5" strokeWidth={BB_V2.iconStroke} />}
              title="深色模式"
              subtitle="切換深色或淺色介面"
              trailing={
                <V2SettingsSwitch
                  checked={darkMode}
                  disabled
                  onChange={setDarkMode}
                />
              }
              last
            />
          </V2SettingsSection>

          <V2SettingsSection title="支援與關於" staggerIndex={3}>
            <V2SettingsRow
              icon={<Gift className="h-5 w-5" strokeWidth={BB_V2.iconStroke} />}
              title="邀請好友"
              subtitle="邀請好友功能即將開放"
              onClick={() => router.push('/settings/invite')}
            />
            <V2SettingsRow
              icon={<CircleHelp className="h-5 w-5" strokeWidth={BB_V2.iconStroke} />}
              title="幫助中心"
              subtitle="常見問題與使用說明"
              onClick={() => router.push('/settings/help')}
            />
            <V2SettingsRow
              icon={<Headphones className="h-5 w-5" strokeWidth={BB_V2.iconStroke} />}
              title="聯絡客服"
              subtitle="我們隨時為你提供協助"
              onClick={() => router.push('/settings/contact')}
            />
            <V2SettingsRow
              icon={<Info className="h-5 w-5" strokeWidth={BB_V2.iconStroke} />}
              title="關於 Betterbit"
              subtitle="版本資訊與開發團隊"
              value={versionLabel}
              onClick={() => router.push('/settings/about')}
              last
            />
          </V2SettingsSection>

          <div className="space-y-4 pt-1">
            <V2SettingsLogoutButton />
            <SettingsDeleteAccountSection compact />
          </div>
        </div>
      </div>
    </V2PageEnter>
  )
}
