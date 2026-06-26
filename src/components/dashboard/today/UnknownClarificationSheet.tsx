'use client'

import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'
import type { ClarificationSession } from '@/lib/nutrition/search-v2/types'
import {
  answerUnknownClarification,
  finalizeUnknownClarification,
  startUnknownFoodClarification,
  type ClarificationResolveResult,
} from '@/lib/nutrition/unknown-food-flow'

const font = 'var(--font-noto-tc), system-ui, sans-serif'
const ICON_STROKE = 1.8

interface Props {
  open: boolean
  foodName: string
  onClose: () => void
  onResolved: (result: ClarificationResolveResult) => void
}

export default function UnknownClarificationSheet({ open, foodName, onClose, onResolved }: Props) {
  const [session, setSession] = useState<ClarificationSession | null>(null)

  useEffect(() => {
    if (!open) {
      setSession(null)
      return
    }
    setSession(startUnknownFoodClarification(foodName))
  }, [open, foodName])

  const currentQuestion = useMemo(() => {
    if (!session) return null
    const unanswered = session.questions.find(q => !session.answers[q.id])
    return unanswered ?? null
  }, [session])

  if (!open) return null

  if (!session) {
    return (
      <div className="fixed inset-0 z-[60] flex items-end justify-center px-5 pb-8" style={{ backgroundColor: 'rgba(47,36,29,0.28)' }}>
        <div className="w-full max-w-md p-6 rounded-3xl" style={{ backgroundColor: BB_V2.bg.card, fontFamily: font }}>
          <p className="text-[15px]" style={{ color: BB_V2.text.primary }}>
            目前沒有適用的澄清問題，請改用手動輸入或選相近品項。
          </p>
          <button type="button" onClick={onClose} className="mt-4 text-[14px]" style={{ color: BB_V2.accent.orange }}>
            關閉
          </button>
        </div>
      </div>
    )
  }

  const handlePick = (optionId: string) => {
    if (!currentQuestion) return
    const next = answerUnknownClarification(session, currentQuestion.id, optionId)
    setSession(next)
    const allDone = next.questions.filter(q => q.required).every(q => next.answers[q.id])
    if (allDone) {
      onResolved(finalizeUnknownClarification(next))
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col justify-end"
      style={{ backgroundColor: 'rgba(47, 36, 29, 0.28)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="ios-bottom-sheet max-w-lg mx-auto w-full"
        style={{ fontFamily: font, backgroundColor: BB_V2.bg.card, borderRadius: '28px 28px 0 0' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-3 flex items-start justify-between">
          <div>
            <h2 className="text-[18px]" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
              幫我判斷一下
            </h2>
            <p className="text-[13px] mt-1" style={{ color: BB_V2.text.secondary }}>
              {foodName} · 第 {Math.min(session.step + 1, session.maxSteps)} / {session.maxSteps} 題
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="關閉">
            <X className="h-5 w-5" strokeWidth={ICON_STROKE} style={{ color: BB_V2.text.secondary }} />
          </button>
        </div>

        {currentQuestion ? (
          <div className="px-5 pb-6 space-y-3">
            <p className="text-[16px]" style={{ color: BB_V2.text.primary, fontWeight: 600 }}>
              {currentQuestion.prompt}
            </p>
            <ul className="space-y-2">
              {currentQuestion.options.map(opt => (
                <li key={opt.id}>
                  <button
                    type="button"
                    onClick={() => handlePick(opt.id)}
                    className="w-full text-left px-4 py-3.5 rounded-2xl active:opacity-90"
                    style={{ backgroundColor: BB_V2.bg.canvas, color: BB_V2.text.primary, fontWeight: 500 }}
                  >
                    {opt.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="px-5 pb-6">
            <p className="text-[14px]" style={{ color: BB_V2.text.secondary }}>
              處理中…
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
