'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Users, Crown, Heart, Bell, Share2 } from 'lucide-react'
import V2SupportPageShell from '@/components/betterbit-v2/settings/visual-v2/V2SupportPageShell'
import V2SettingsVisualCard from '@/components/betterbit-v2/settings/visual-v2/V2SettingsVisualCard'
import V2InviteGiftIcon from '@/components/betterbit-v2/settings/visual-v2/V2InviteGiftIcon'

const REFERRAL_ENABLED = false

const STEPS = [
  {
    icon: <Users className="h-4 w-4" />,
    title: '好友加入',
    subtitle: '好友透過你的邀請連結下載並註冊',
  },
  {
    icon: <Crown className="h-4 w-4" />,
    title: '雙方獲獎勵',
    subtitle: '你和好友都能獲得 Pro 試用天數',
  },
  {
    icon: <Heart className="h-4 w-4" />,
    title: '一起變更健康',
    subtitle: '和好友一起記錄飲食，互相激勵',
  },
]

function comingSoonToast() {
  toast.message('邀請好友功能即將開放')
}

export default function InviteFriendsView() {
  const router = useRouter()

  function handleShare() {
    if (!REFERRAL_ENABLED) {
      comingSoonToast()
      return
    }
  }

  return (
    <V2SupportPageShell
      title="邀請好友"
      subtitle="邀請好友功能即將開放"
      footer={
        <>
          <button
            type="button"
            disabled={!REFERRAL_ENABLED}
            onClick={handleShare}
            className="v2-sv2-btn-share touch-manipulation"
          >
            <Share2 className="h-5 w-5" />
            分享邀請連結
          </button>
          <button type="button" onClick={() => router.push('/settings')} className="v2-sv2-btn-secondary touch-manipulation">
            取消
          </button>
        </>
      }
    >
      <section className="v2-sv2-invite-hero v2-sv2-card" style={{ animationDelay: '0ms' }}>
        <V2InviteGiftIcon />
        <h2 className="text-[18px] font-bold" style={{ color: '#123d24' }}>
          邀請好友，雙方都有獎勵！
        </h2>
        <p className="text-[13px] mt-2 leading-relaxed px-2" style={{ color: '#7a807a' }}>
          邀請好友加入 BetterBit，
          <br />
          雙方都可獲得 Pro 試用天數或專屬優惠。
        </p>
      </section>

      <V2SettingsVisualCard icon={<Users className="h-4 w-4" />} title="如何運作" staggerIndex={1}>
        {STEPS.map(step => (
          <div key={step.title} className="flex items-start gap-3 py-3 border-b border-[rgba(230,238,226,0.8)] last:border-0">
            <div className="v2-sv2-row-icon shrink-0">{step.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold" style={{ color: '#123d24' }}>
                {step.title}
              </p>
              <p className="text-[12px] mt-0.5 leading-relaxed" style={{ color: '#7a807a' }}>
                {step.subtitle}
              </p>
            </div>
          </div>
        ))}
      </V2SettingsVisualCard>

      <section className="v2-sv2-coming-soon-card v2-sv2-card" style={{ animationDelay: '80ms' }}>
        <p className="text-[16px] font-bold" style={{ color: '#123d24' }}>
          功能即將開放
        </p>
        <p className="text-[13px] mt-2 leading-relaxed" style={{ color: '#7a807a' }}>
          我們正在準備更好的邀請體驗，敬請期待！
        </p>
        <button type="button" onClick={comingSoonToast} className="v2-sv2-notify-btn touch-manipulation">
          <Bell className="h-4 w-4" />
          通知我上線
        </button>
      </section>
    </V2SupportPageShell>
  )
}
