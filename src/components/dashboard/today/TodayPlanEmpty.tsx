'use client'

import { pickZaiJianLine } from '@/lib/copy/zaijian'
import ZaiJian from '@/components/character/ZaiJian'
import GeneratePlanButton from '@/components/dashboard/GeneratePlanButton'
import { BB_V2 } from '@/lib/betterbit-v2'
import BBCard from '@/components/ui/BBCard'

interface Props {
  failed?: boolean
  errorMessage?: string | null
  onPlanGenerated?: () => void
}

export default function TodayPlanEmpty({ failed = false, errorMessage, onPlanGenerated }: Props) {
  const line = failed
    ? { text: '沒送出去，再試一次。', subtext: errorMessage ?? '再試一次就好。', expression: 'normal' as const }
    : pickZaiJianLine('empty')

  return (
    <div
      className="px-5 app-page-top pb-10 max-w-lg mx-auto flex flex-col"
      style={{
        fontFamily: BB_V2.font,
        minHeight: 'calc(100dvh - var(--app-nav-total) - 16px)',
      }}
    >
      <header className="pb-4">
        <h1 className="text-[22px] tracking-tight leading-tight" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
          今天
        </h1>
      </header>

      <div className="flex-1 flex flex-col justify-center py-6">
        <BBCard className="text-center space-y-6 py-10 px-6">
          <ZaiJian
            size="md"
            line={line}
            layout="stack"
            showFace
            className="mx-auto max-w-xs"
          />
          <GeneratePlanButton onPlanGenerated={onPlanGenerated} />
        </BBCard>
      </div>
    </div>
  )
}
