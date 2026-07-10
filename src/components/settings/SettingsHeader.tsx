'use client'

import { BB_V2 } from '@/lib/betterbit-v2'

/** @deprecated Use V2SettingsLoadingSkeleton — legacy header without old copy. */
export default function SettingsHeader() {
  return (
    <header className="px-5 app-page-top pb-2 text-center">
      <h1 className="text-[18px]" style={{ color: BB_V2.text.deepGreen, fontWeight: 700 }}>
        設定
      </h1>
    </header>
  )
}
