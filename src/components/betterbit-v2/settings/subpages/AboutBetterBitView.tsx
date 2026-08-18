'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Info,
  FileText,
  Shield,
  Code2,
  Puzzle,
  Award,
  Users,
  User,
  Paintbrush,
  Terminal,
  Heart,
  HeartPulse,
} from 'lucide-react'
import { formatAppVersionWithBuild } from '@/lib/app-version'
import { isNativeIOS } from '@/lib/capacitor-native'
import { getNativeAppInfo, type NativeAppInfo } from '@/lib/native-app-info'
import V2SupportPageShell from '@/components/betterbit-v2/settings/visual-v2/V2SupportPageShell'
import V2SettingsVisualCard from '@/components/betterbit-v2/settings/visual-v2/V2SettingsVisualCard'
import V2OverlayPortal from '@/components/betterbit-v2/settings/visual-v2/V2OverlayPortal'
import { V2VisualChevronRow } from '@/components/betterbit-v2/settings/visual-v2/V2SettingsVisualPrimitives'

interface ModalContent {
  title: string
  body: string
}

export default function AboutBetterBitView({ appVersion }: { appVersion: string }) {
  const router = useRouter()
  const [modal, setModal] = useState<ModalContent | null>(null)
  const [onIos, setOnIos] = useState(false)
  const [nativeInfo, setNativeInfo] = useState<NativeAppInfo | null>(null)
  // On native iOS, prefer the real installed version/build (App.getInfo())
  // over the package.json-derived `appVersion` prop — see native-app-info.ts.
  // Falls back to the existing package.json path on web, or if the native
  // call fails for any reason, never a hardcoded literal.
  const versionLabel = nativeInfo
    ? formatAppVersionWithBuild(nativeInfo.version, nativeInfo.build)
    : formatAppVersionWithBuild(appVersion)

  useEffect(() => {
    setOnIos(isNativeIOS())
    void getNativeAppInfo().then(setNativeInfo)
  }, [])

  const thirdPartyBody = onIos
    ? 'Betterbit 使用以下第三方服務：\n\n• Supabase — 帳號與資料同步\n• RevenueCat — 訂閱權益管理\n• Apple In-App Purchase — iOS App 內付款\n• Vercel — 應用部署與 API'
    : 'Betterbit 使用以下第三方服務：\n\n• Supabase — 帳號與資料同步\n• RevenueCat — 訂閱權益管理\n• Apple In-App Purchase — iOS App 內付款\n• Vercel — 應用部署與 API\n• Stripe — Web 付款使用'

  return (
    <>
      <V2SupportPageShell title="關於 Betterbit" subtitle="版本資訊與開發團隊">
        <section className="v2-sv2-card v2-sv2-about-brand" style={{ animationDelay: '0ms' }}>
          <div className="v2-sv2-about-logo">
            <Heart className="h-8 w-8 text-white" fill="white" />
          </div>
          <h2 className="text-[22px] font-bold tracking-wide" style={{ color: '#123d24' }}>
            BETTERBIT
          </h2>
          <p className="text-[15px] font-semibold mt-1" style={{ color: '#2f8f35' }}>
            {versionLabel}
          </p>
          <p className="text-[13px] mt-3 leading-relaxed px-4" style={{ color: '#7a807a' }}>
            你的減脂好夥伴，陪你吃得聰明、瘦得健康。
          </p>
        </section>

        <V2SettingsVisualCard icon={<Info className="h-4 w-4" />} title="應用資訊" staggerIndex={1}>
          <V2VisualChevronRow
            icon={<Info className="h-4 w-4" />}
            label="版本資訊"
            value={versionLabel}
            onClick={() =>
              setModal({
                title: '版本資訊',
                body: nativeInfo
                  ? `Betterbit ${versionLabel}\n\n版本號讀取自 App 實際安裝版本。`
                  : `Betterbit ${versionLabel}\n\n版本號來自 package.json，build 號可透過 NEXT_PUBLIC_APP_BUILD 設定。`,
              })
            }
          />
          <V2VisualChevronRow
            icon={<FileText className="h-4 w-4" />}
            label="使用條款"
            onClick={() => router.push('/terms')}
          />
          <V2VisualChevronRow
            icon={<Shield className="h-4 w-4" />}
            label="隱私權政策"
            onClick={() => router.push('/privacy')}
          />
          <V2VisualChevronRow
            icon={<HeartPulse className="h-4 w-4" />}
            label="健康資訊與資料來源"
            onClick={() => router.push('/health-sources')}
          />
          <V2VisualChevronRow
            icon={<Code2 className="h-4 w-4" />}
            label="開源聲明"
            onClick={() =>
              setModal({
                title: '開源聲明',
                body: 'Betterbit 使用多項開源軟體與函式庫，包括 Next.js、React、Supabase Client 等。完整清單將於後續版本提供。',
              })
            }
          />
          <V2VisualChevronRow
            icon={<Puzzle className="h-4 w-4" />}
            label="第三方服務"
            onClick={() => setModal({ title: '第三方服務', body: thirdPartyBody })}
          />
          <V2VisualChevronRow
            icon={<Award className="h-4 w-4" />}
            label="授權資訊"
            onClick={() =>
              setModal({
                title: '授權資訊',
                body: 'Betterbit 使用之第三方 SDK 與服務，依各自授權條款使用。',
              })
            }
          />
        </V2SettingsVisualCard>

        <V2SettingsVisualCard icon={<Users className="h-4 w-4" />} title="開發團隊" staggerIndex={2}>
          {[
            { icon: <Users className="h-4 w-4" />, title: 'Betterbit 團隊', subtitle: '產品設計與開發' },
            { icon: <User className="h-4 w-4" />, title: '產品經理', subtitle: 'Betterbit Product Team' },
            { icon: <Paintbrush className="h-4 w-4" />, title: 'UI/UX 設計', subtitle: 'Betterbit Design Team' },
            { icon: <Terminal className="h-4 w-4" />, title: '工程團隊', subtitle: 'Betterbit Development Team' },
          ].map(row => (
            <div
              key={row.title}
              className="flex items-start gap-3 py-3 border-b border-[rgba(230,238,226,0.8)] last:border-0"
            >
              <div className="v2-sv2-row-icon shrink-0">{row.icon}</div>
              <div>
                <p className="text-[14px] font-semibold" style={{ color: '#123d24' }}>
                  {row.title}
                </p>
                <p className="text-[12px] mt-0.5" style={{ color: '#7a807a' }}>
                  {row.subtitle}
                </p>
              </div>
            </div>
          ))}
        </V2SettingsVisualCard>

        <footer className="v2-sv2-about-footer">
          <p>© 2025 Betterbit. All rights reserved.</p>
          <p className="mt-1">Made with 💚 for your better life.</p>
        </footer>
      </V2SupportPageShell>

      {modal && (
        <V2OverlayPortal open onClose={() => setModal(null)} className="v2-sv2-modal-overlay">
          <div className="v2-sv2-modal-sheet" onClick={e => e.stopPropagation()}>
            <p className="text-[18px] font-bold mb-3" style={{ color: '#123d24' }}>
              {modal.title}
            </p>
            <p className="text-[14px] leading-relaxed whitespace-pre-line" style={{ color: '#123d24' }}>
              {modal.body}
            </p>
            <button type="button" onClick={() => setModal(null)} className="v2-sv2-btn-secondary w-full mt-5 touch-manipulation">
              關閉
            </button>
          </div>
        </V2OverlayPortal>
      )}
    </>
  )
}
