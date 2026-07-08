'use client'

import { useRouter } from 'next/navigation'
import { colors } from '@/lib/design-system'

export default function LegalBackLink() {
  const router = useRouter()

  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
          router.back()
          return
        }
        router.push('/settings')
      }}
      className="inline-flex items-center min-h-[48px] min-w-[48px] -ml-2 px-3 text-[15px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 rounded-xl active:opacity-70"
      style={{ color: colors.text.secondary, fontWeight: 500 }}
    >
      ← 設定
    </button>
  )
}
