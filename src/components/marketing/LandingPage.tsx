'use client'

import Link from 'next/link'
import { Camera, PieChart, Target, Flame } from 'lucide-react'
import BetterBitLogo from '@/components/brand/BetterBitLogo'
import { BB_V2 } from '@/lib/betterbit-v2'

/**
 * Welcome / Onboarding entry page (design image 1).
 * Shown at `/` for signed-out users. Faithful clone of the target design:
 * logo, wordmark, tagline, hero copy, three feature cards, a "today" preview
 * card, primary CTA (register) and a secondary login button.
 *
 * No fake phone mockup, no "Visual V2" text, no dark background.
 */

const FEATURES = [
  { icon: Camera, title: '拍照記錄', desc: '快速記錄每一餐' },
  { icon: PieChart, title: '營養分析', desc: '自動估算熱量' },
  { icon: Target, title: '達成目標', desc: '減脂更有方向' },
] as const

export default function LandingPage() {
  return (
    <div
      className="v2-page-bg"
      style={{
        height: '100dvh',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        backgroundColor: '#FDFCF8',
        fontFamily: BB_V2.font,
      }}
    >
      <div
        className="mx-auto flex flex-col"
        style={{
          maxWidth: 390,
          minHeight: '100%',
          padding: '0 20px',
          paddingTop: 'calc(env(safe-area-inset-top) + 24px)',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 28px)',
          gap: 18,
        }}
      >
        {/* Brand — reference logo mark (PNG), not App Icon */}
        <div className="flex flex-col items-center text-center" style={{ gap: 5 }}>
          <BetterBitLogo size={58} />
          <p style={{ fontSize: 24, fontWeight: 700, color: BB_V2.text.deepGreen, margin: '4px 0 0', letterSpacing: '-0.01em' }}>BetterBit</p>
          <p style={{ fontSize: 13, color: BB_V2.text.secondary, margin: 0 }}>Eat smart. Live better.</p>
        </div>

        {/* Hero */}
        <div className="text-center" style={{ marginTop: 2 }}>
          <h1 style={{ fontSize: 22, lineHeight: 1.4, fontWeight: 700, color: BB_V2.text.deepGreen, margin: 0 }}>
            外食減脂不用算，
            <br />
            BetterBit 幫你算好
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.65, color: BB_V2.text.secondary, marginTop: 12 }}>
            拍一餐、看懂今天還能吃多少，
            <br />
            讓每一次外食都更接近目標。
          </p>
        </div>

        {/* Feature cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              style={{
                background: BB_V2.bg.card,
                borderRadius: 16,
                border: `1px solid ${BB_V2.border}`,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                padding: '14px 6px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: 6,
              }}
            >
              <span
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: BB_V2.bg.softGreen,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon size={19} color={BB_V2.accent.green} strokeWidth={2} />
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: BB_V2.text.primary }}>{title}</span>
              <span style={{ fontSize: 10, lineHeight: 1.35, color: BB_V2.text.secondary }}>{desc}</span>
            </div>
          ))}
        </div>

        {/* Today preview card */}
        <div
          style={{
            background: BB_V2.bg.card,
            borderRadius: 24,
            border: `1px solid ${BB_V2.border}`,
            boxShadow: BB_V2.shadow.card,
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span
              style={{
                width: 46,
                height: 46,
                borderRadius: 999,
                background: BB_V2.bg.softGreen,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Flame size={24} color={BB_V2.accent.green} strokeWidth={2} />
            </span>
            <div>
              <p style={{ fontSize: 12, color: BB_V2.text.secondary, margin: 0 }}>今日剩餘熱量</p>
              <p style={{ margin: '2px 0 0', display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 30, fontWeight: 700, color: BB_V2.text.deepGreen, lineHeight: 1 }}>650</span>
                <span style={{ fontSize: 13, color: BB_V2.text.secondary }}>kcal</span>
              </p>
              <p style={{ fontSize: 11, color: BB_V2.text.muted, margin: '3px 0 0' }}>目標 1900 kcal</p>
            </div>
          </div>
          <ProgressRing percent={65} />
        </div>

        {/* CTAs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 2 }}>
          <Link href="/register" className="block">
            <button
              type="button"
              className="v2-btn-press touch-manipulation"
              style={{
                width: '100%',
                background: BB_V2.accent.green,
                color: '#fff',
                border: 'none',
                borderRadius: 18,
                boxShadow: BB_V2.shadow.button,
                padding: '13px 16px',
                cursor: 'pointer',
              }}
            >
              <span style={{ display: 'block', fontSize: 16, fontWeight: 700 }}>開始使用</span>
              <span style={{ display: 'block', fontSize: 12, opacity: 0.92, marginTop: 2 }}>14 天免費試用</span>
            </button>
          </Link>
          <Link href="/login" className="block">
            <button
              type="button"
              className="v2-btn-press touch-manipulation"
              style={{
                width: '100%',
                background: BB_V2.bg.pill,
                color: BB_V2.text.deepGreen,
                border: `1px solid ${BB_V2.border}`,
                borderRadius: 18,
                padding: '13px 16px',
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              登入
            </button>
          </Link>
        </div>

        {/* Terms */}
        <p style={{ fontSize: 12, textAlign: 'center', color: BB_V2.text.muted, lineHeight: 1.6, margin: 0 }}>
          繼續使用即表示同意{' '}
          <Link href="/terms" style={{ color: BB_V2.text.secondary, textDecoration: 'underline' }}>
            服務條款
          </Link>{' '}
          與{' '}
          <Link href="/privacy" style={{ color: BB_V2.text.secondary, textDecoration: 'underline' }}>
            隱私政策
          </Link>
        </p>
      </div>
    </div>
  )
}

function ProgressRing({ percent }: { percent: number }) {
  const size = 62
  const stroke = 6
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const dash = (percent / 100) * c
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={BB_V2.ring.track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={BB_V2.ring.fill}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 700, color: BB_V2.text.deepGreen, lineHeight: 1 }}>{percent}%</span>
        <span style={{ fontSize: 9, color: BB_V2.text.muted, marginTop: 1 }}>已攝取</span>
      </div>
    </div>
  )
}
