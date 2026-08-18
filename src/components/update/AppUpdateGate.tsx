'use client'

import { useState } from 'react'
import { useAppUpdateCheck } from './use-app-update-check'
import AppUpdateModal from './AppUpdateModal'
import AppForceUpdateModal from './AppForceUpdateModal'

const FALLBACK_UPDATE_URL = 'https://apps.apple.com/'

function openUpdateUrl(url: string | undefined) {
  window.open(url && url.trim() ? url : FALLBACK_UPDATE_URL, '_blank', 'noopener,noreferrer')
}

/**
 * Mounted once at the root layout, alongside CapacitorShell/OfflineShell —
 * same pattern, same lifetime (persists across client-side route changes,
 * which is what makes "at most once per session" true for free, see
 * use-app-update-check.ts's doc comment). Renders nothing on web or when
 * there's nothing to show.
 */
export default function AppUpdateGate() {
  const decision = useAppUpdateCheck()
  const [dismissed, setDismissed] = useState(false)

  if (decision.kind === 'required') {
    return (
      <AppForceUpdateModal
        open
        title={decision.title || '需要更新 BetterBit'}
        message={
          decision.message ||
          '這個版本已經太舊，為了確保飲食紀錄與營養計算正常，請先更新至最新版本。'
        }
        onUpdate={() => openUpdateUrl(decision.updateUrl)}
      />
    )
  }

  if (decision.kind === 'optional') {
    return (
      <AppUpdateModal
        open={!dismissed}
        title={decision.title || 'BetterBit 有新版本囉'}
        message={decision.message || '建議更新至最新版本，體驗最新的功能與修正。'}
        onUpdate={() => openUpdateUrl(decision.updateUrl)}
        onDismiss={() => setDismissed(true)}
      />
    )
  }

  return null
}
