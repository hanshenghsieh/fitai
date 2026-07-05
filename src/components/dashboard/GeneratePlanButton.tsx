'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { BB_V2 } from '@/lib/betterbit-v2'
import { zaijian } from '@/lib/copy/zaijian'
import { generatePlanAction } from '@/app/(app)/dashboard/generate-plan-action'

export default function GeneratePlanButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [loading, setLoading] = useState(false)
  const busy = loading || isPending

  function handleGenerate() {
    setLoading(true)
    startTransition(async () => {
      try {
        const result = await generatePlanAction()
        if (!result.ok) {
          toast.error(result.error ?? '沒送出去，再試一次。')
          return
        }
        toast.success('好，本週開始。')
        router.refresh()
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
