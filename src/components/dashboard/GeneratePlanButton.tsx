'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { colors } from '@/lib/design-system'
import { pickZaiJianLine, zaijian } from '@/lib/copy/zaijian'
import { parseGeneratePlanError } from '@/lib/api-errors'

export default function GeneratePlanButton() {
  const [loading, setLoading] = useState(false)

  async function handleGenerate() {
    setLoading(true)
    try {
      const res = await fetch('/api/generate-plan', { method: 'POST' })
      if (!res.ok) {
        toast.error(await parseGeneratePlanError(res))
        setLoading(false)
        return
      }
      toast.success('好，本週開始。')
      window.location.reload()
    } catch {
      toast.error('網路連線失敗，請檢查網路後再試')
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleGenerate}
      disabled={loading}
      className="px-6 py-3 rounded-xl font-semibold transition-colors text-white disabled:opacity-60"
      style={{ backgroundColor: colors.accent.action }}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          {zaijian.generating}
        </span>
      ) : (
        '幫我排本週'
      )}
    </button>
  )
}
