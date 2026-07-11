'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { appRoute } from '@/lib/navigation/routes'
import {
  Search,
  CircleHelp,
  BookOpen,
  Rocket,
  Camera,
  Target,
  Landmark,
  BarChart3,
  Headphones,
  MessageCircle,
} from 'lucide-react'
import V2SupportPageShell from '@/components/betterbit-v2/settings/visual-v2/V2SupportPageShell'
import V2SettingsVisualCard from '@/components/betterbit-v2/settings/visual-v2/V2SettingsVisualCard'
import V2OverlayPortal from '@/components/betterbit-v2/settings/visual-v2/V2OverlayPortal'
import { HELP_FAQ_ITEMS, HELP_GUIDE_ITEMS, type HelpGuideItem } from '@/lib/settings/help-center-content'
import { ChevronRight } from 'lucide-react'

const GUIDE_ICONS: Record<string, ReactNode> = {
  'quick-start': <Rocket className="h-4 w-4" />,
  'photo-tutorial': <Camera className="h-4 w-4" />,
  'goal-tutorial': <Target className="h-4 w-4" />,
  'calorie-bank': <Landmark className="h-4 w-4" />,
  'analysis-tutorial': <BarChart3 className="h-4 w-4" />,
}

export default function HelpCenterView() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [openFaqId, setOpenFaqId] = useState<string | null>(null)
  const [guideModal, setGuideModal] = useState<HelpGuideItem | null>(null)

  const filteredFaq = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return HELP_FAQ_ITEMS
    return HELP_FAQ_ITEMS.filter(
      item => item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q)
    )
  }, [query])

  const filteredGuides = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return HELP_GUIDE_ITEMS
    return HELP_GUIDE_ITEMS.filter(
      item =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.body.toLowerCase().includes(q)
    )
  }, [query])

  const noResults = query.trim() && filteredFaq.length === 0 && filteredGuides.length === 0

  return (
    <>
      <V2SupportPageShell title="幫助中心" subtitle="常見問題與使用說明">
        <div className="v2-sv2-search-bar">
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="搜尋問題或關鍵字"
            className="v2-sv2-search-input"
          />
          <Search className="h-5 w-5 shrink-0" style={{ color: '#7a807a' }} />
        </div>

        {noResults ? (
          <V2SettingsVisualCard icon={<CircleHelp className="h-4 w-4" />} title="搜尋結果" staggerIndex={0}>
            <p className="text-[14px] font-semibold" style={{ color: '#123d24' }}>
              找不到相關問題
            </p>
            <p className="text-[13px] mt-2 leading-relaxed" style={{ color: '#7a807a' }}>
              可以聯絡客服，我們會協助你。
            </p>
          </V2SettingsVisualCard>
        ) : (
          <>
            {filteredFaq.length > 0 && (
              <V2SettingsVisualCard icon={<CircleHelp className="h-4 w-4" />} title="常見問題" staggerIndex={0}>
                {filteredFaq.map(item => {
                  const open = openFaqId === item.id
                  return (
                    <div key={item.id}>
                      <button
                        type="button"
                        onClick={() => setOpenFaqId(open ? null : item.id)}
                        className="v2-sv2-faq-row touch-manipulation"
                      >
                        <span className="text-[14px] font-semibold flex-1" style={{ color: '#123d24' }}>
                          {item.question}
                        </span>
                        <ChevronRight
                          className={`h-4 w-4 shrink-0 v2-sv2-row-chevron transition-transform ${open ? 'rotate-90' : ''}`}
                          style={{ color: '#7a807a' }}
                        />
                      </button>
                      {open && <p className="v2-sv2-faq-answer">{item.answer}</p>}
                    </div>
                  )
                })}
              </V2SettingsVisualCard>
            )}

            {filteredGuides.length > 0 && (
              <V2SettingsVisualCard icon={<BookOpen className="h-4 w-4" />} title="使用說明" staggerIndex={1}>
                {filteredGuides.map(guide => (
                  <button
                    key={guide.id}
                    type="button"
                    onClick={() => setGuideModal(guide)}
                    className="v2-sv2-guide-row touch-manipulation"
                  >
                    <div className="v2-sv2-row-icon shrink-0">{GUIDE_ICONS[guide.id] ?? <BookOpen className="h-4 w-4" />}</div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-[14px] font-semibold" style={{ color: '#123d24' }}>
                        {guide.title}
                      </p>
                      <p className="text-[12px] mt-0.5" style={{ color: '#7a807a' }}>
                        {guide.subtitle}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 v2-sv2-row-chevron" style={{ color: '#7a807a' }} />
                  </button>
                ))}
              </V2SettingsVisualCard>
            )}
          </>
        )}

        <div className="v2-sv2-help-cta v2-sv2-card" style={{ animationDelay: '120ms' }}>
          <div className="v2-sv2-row-icon shrink-0">
            <Headphones className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold" style={{ color: '#123d24' }}>
              找不到答案？
            </p>
            <p className="text-[12px] mt-1 leading-relaxed" style={{ color: '#7a807a' }}>
              如果沒有找到你需要的答案，可以聯絡我們的客服團隊。
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push(appRoute('/settings/contact'))}
            className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[13px] font-semibold touch-manipulation"
            style={{ backgroundColor: '#2f8f35', color: '#fff' }}
          >
            <MessageCircle className="h-4 w-4" />
            聯絡客服
          </button>
        </div>
      </V2SupportPageShell>

      {guideModal && (
        <V2OverlayPortal open onClose={() => setGuideModal(null)} className="v2-sv2-modal-overlay">
          <div className="v2-sv2-modal-sheet" onClick={e => e.stopPropagation()}>
            <p className="text-[18px] font-bold mb-1" style={{ color: '#123d24' }}>
              {guideModal.title}
            </p>
            <p className="text-[13px] mb-4" style={{ color: '#7a807a' }}>
              {guideModal.subtitle}
            </p>
            <p className="text-[14px] leading-relaxed" style={{ color: '#123d24' }}>
              {guideModal.body}
            </p>
            <button type="button" onClick={() => setGuideModal(null)} className="v2-sv2-btn-secondary w-full mt-5 touch-manipulation">
              關閉
            </button>
          </div>
        </V2OverlayPortal>
      )}
    </>
  )
}
