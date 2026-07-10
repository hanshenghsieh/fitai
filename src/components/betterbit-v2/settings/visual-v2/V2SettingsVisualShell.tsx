'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronLeft, Loader2 } from 'lucide-react'
import { SETTINGS_SAVING_LABEL } from '@/lib/settings/settings-form-messages'
import V2SettingsLeaveDialog from '../subpages/V2SettingsLeaveDialog'

interface Props {
  title: string
  subtitle?: string
  backHref?: string
  saveLabel: string
  onSave: () => void | Promise<void>
  onCancel?: () => void
  saving?: boolean
  saveDisabled?: boolean
  isDirty?: boolean
  children: ReactNode
  footerExtra?: ReactNode
}

export default function V2SettingsVisualShell({
  title,
  subtitle,
  backHref = '/settings',
  saveLabel,
  onSave,
  onCancel,
  saving = false,
  saveDisabled = false,
  isDirty = false,
  children,
  footerExtra,
}: Props) {
  const router = useRouter()
  const [leaveOpen, setLeaveOpen] = useState(false)

  const navigateBack = useCallback(() => {
    router.push(backHref)
  }, [router, backHref])

  const handleBack = useCallback(() => {
    if (isDirty) {
      setLeaveOpen(true)
      return
    }
    navigateBack()
  }, [isDirty, navigateBack])

  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel()
      return
    }
    if (isDirty) {
      setLeaveOpen(true)
      return
    }
    navigateBack()
  }, [isDirty, navigateBack, onCancel])

  useEffect(() => {
    if (!isDirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isDirty])

  const disableSave = saving || saveDisabled
  const resolvedLabel = saving ? SETTINGS_SAVING_LABEL : saveLabel

  return (
    <div className="v2-sv2-page">
      <div
        className="max-w-[640px] mx-auto flex flex-col min-h-[100dvh]"
        style={{ paddingLeft: 20, paddingRight: 20 }}
      >
        <header className="pt-[max(8px,var(--app-safe-top,0px))] pb-4">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-0.5 min-h-[44px] -ml-1 px-1 text-[15px] touch-manipulation v2-sv2-row"
            style={{ color: '#7a807a', fontWeight: 500, border: 'none', padding: '8px 4px' }}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            設定
          </button>
          <h1
            className="text-[22px] text-center mt-1"
            style={{ color: '#123d24', fontWeight: 700, letterSpacing: '-0.02em' }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className="text-[13px] text-center mt-2 leading-relaxed px-3"
              style={{ color: '#7a807a' }}
            >
              {subtitle}
            </p>
          )}
        </header>

        <div className="flex-1 space-y-4 pb-[calc(var(--app-nav-total,72px)+24px)]">{children}</div>

        <div
          className="space-y-3 pb-[max(20px,var(--app-safe-bottom,0px))]"
          style={{ paddingBottom: 'max(calc(var(--app-nav-total,72px) + 12px), 20px)' }}
        >
          {footerExtra}
          <button
            type="button"
            disabled={disableSave}
            onClick={() => void onSave()}
            className="v2-sv2-btn-primary touch-manipulation"
          >
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <span
                className="inline-flex items-center justify-center w-6 h-6 rounded-full"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
              >
                <Check className="h-3.5 w-3.5" />
              </span>
            )}
            {resolvedLabel}
          </button>
          <button type="button" onClick={handleCancel} className="v2-sv2-btn-secondary touch-manipulation">
            取消
          </button>
        </div>
      </div>

      <V2SettingsLeaveDialog
        open={leaveOpen}
        onStay={() => setLeaveOpen(false)}
        onLeave={() => {
          setLeaveOpen(false)
          navigateBack()
        }}
      />
    </div>
  )
}
