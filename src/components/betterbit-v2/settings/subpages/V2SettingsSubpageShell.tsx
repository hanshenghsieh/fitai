'use client'



import { useCallback, useEffect, useState, type ReactNode } from 'react'

import { useRouter } from 'next/navigation'

import { ChevronLeft, Loader2 } from 'lucide-react'

import { BB_V2 } from '@/lib/betterbit-v2'

import { SETTINGS_SAVING_LABEL } from '@/lib/settings/settings-form-messages'

import V2PageBackground from '@/components/betterbit-v2/V2PageBackground'

import V2PageEnter from '@/components/betterbit-v2/V2PageEnter'

import V2SettingsLeaveDialog from './V2SettingsLeaveDialog'



interface Props {

  title: string

  subtitle?: string

  backHref?: string

  backLabel?: string

  headerAction?: ReactNode

  saveLabel?: string

  onSave?: () => void | Promise<void>

  saving?: boolean

  saveDisabled?: boolean

  isDirty?: boolean

  children: ReactNode

}



export default function V2SettingsSubpageShell({

  title,

  subtitle,

  backHref = '/settings',

  backLabel = '設定',

  headerAction,

  saveLabel = '儲存變更',

  onSave,

  saving = false,

  saveDisabled = false,

  isDirty = false,

  children,

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



  useEffect(() => {

    if (!isDirty) return

    const onBeforeUnload = (event: BeforeUnloadEvent) => {

      event.preventDefault()

      event.returnValue = ''

    }

    window.addEventListener('beforeunload', onBeforeUnload)

    return () => window.removeEventListener('beforeunload', onBeforeUnload)

  }, [isDirty])



  const resolvedSaveLabel = saving ? SETTINGS_SAVING_LABEL : saveLabel

  const disableSave = saving || saveDisabled



  return (

    <V2PageBackground>

      <V2PageEnter>

        <div

          className="v2-settings-subpage max-w-[640px] mx-auto min-h-[100dvh] flex flex-col"

          style={{ paddingLeft: 20, paddingRight: 20 }}

        >

          <header

            className="sticky top-0 z-20 pt-[max(8px,var(--app-safe-top,0px))] pb-3"

            style={{

              background: `linear-gradient(180deg, ${BB_V2.bg.canvas} 70%, transparent)`,

            }}

          >

            <div className="flex items-center justify-between gap-3 min-h-[44px]">

              <button

                type="button"

                onClick={handleBack}

                className="inline-flex items-center gap-0.5 min-h-[44px] -ml-1 px-1 text-[15px] rounded-xl v2-settings-row--interactive touch-manipulation"

                style={{ color: BB_V2.text.secondary, fontWeight: 500 }}

              >

                <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />

                {backLabel}

              </button>

              {headerAction}

            </div>

            <h1

              className="text-[20px] text-center -mt-1"

              style={{ color: BB_V2.text.deepGreen, fontWeight: 700 }}

            >

              {title}

            </h1>

            {subtitle && (

              <p

                className="text-[13px] text-center mt-2 leading-relaxed px-2"

                style={{ color: BB_V2.text.secondary }}

              >

                {subtitle}

              </p>

            )}

          </header>



          <div className="flex-1 pb-[calc(var(--app-nav-total,72px)+88px)] space-y-4 pt-2">{children}</div>



          {onSave && (

            <div

              className="fixed left-0 right-0 z-30 px-5 pb-[max(16px,var(--app-safe-bottom,0px))] pt-3"

              style={{

                bottom: 'var(--app-nav-total, 72px)',

                background: `linear-gradient(0deg, ${BB_V2.bg.canvas} 75%, transparent)`,

              }}

            >

              <div className="max-w-[640px] mx-auto">

                <button

                  type="button"

                  disabled={disableSave}

                  onClick={() => void onSave()}

                  className="v2-settings-save-btn w-full min-h-[52px] rounded-full text-[16px] flex items-center justify-center gap-2 disabled:opacity-45 touch-manipulation"

                  style={{

                    backgroundColor: BB_V2.accent.green,

                    color: '#FFFFFF',

                    fontWeight: 600,

                  }}

                >

                  {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : resolvedSaveLabel}

                </button>

              </div>

            </div>

          )}

        </div>

      </V2PageEnter>



      <V2SettingsLeaveDialog

        open={leaveOpen}

        onStay={() => setLeaveOpen(false)}

        onLeave={() => {

          setLeaveOpen(false)

          navigateBack()

        }}

      />

    </V2PageBackground>

  )

}

