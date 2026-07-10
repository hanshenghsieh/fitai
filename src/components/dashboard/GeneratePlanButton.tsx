'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { BB_V2 } from '@/lib/betterbit-v2'
import { zaijian } from '@/lib/copy/zaijian'
import { apiFetch } from '@/lib/api/client'
import { messageForGeneratePlanError } from '@/lib/generate-plan-errors'
import { isCapacitorNative } from '@/lib/capacitor-native'

interface Props {
  onPlanGenerated?: () => void
}

export default function GeneratePlanButton({ onPlanGenerated }: Props) {
  const [isPending, startTransition] = useTransition()
  const [loading, setLoading] = useState(false)
  const busy = loading || isPending

  function handleGenerate() {
    setLoading(true)
    startTransition(async () => {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (isCapacitorNative()) {
          headers['x-betterbit-platform'] = 'ios'
        }
        const res = await apiFetch('/api/generate-plan', {
          method: 'POST',
          headers,
          body: JSON.stringify({}),
        })
        const json = (await res.json().catch(() => ({}))) as { error?: string; code?: string }
        if (!res.ok) {
          toast.error(
            messageForGeneratePlanError({ error: json.error, code: json.code }) ??
              '沒送出去，再試一次。'
          )
          return
        }
        toast.success('好，本週開始。')
        onPlanGenerated?.()
      } catch {
        toast.error('沒送出去，再試一次。')
      } finally {
        setLoading(false)
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleGenerate}
      disabled={busy}
      className="w-full h-14 rounded-[22px] text-[16px] disabled:opacity-60 touch-manipulation active:scale-[0.99] transition-transform"
      style={{ backgroundColor: BB_V2.accent.orange, color: '#FFFFFF', fontWeight: 600 }}
    >
      {busy ? (
        <span className="inline-flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          {zaijian.generating}
        </span>
      ) : (
        '幫我排本週'
      )}
    </button>
  )
}
