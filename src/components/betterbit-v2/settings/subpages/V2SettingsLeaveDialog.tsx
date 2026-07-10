'use client'

import { BB_V2 } from '@/lib/betterbit-v2'
import {
  LEAVE_DIALOG_BODY,
  LEAVE_DIALOG_LEAVE,
  LEAVE_DIALOG_STAY,
  LEAVE_DIALOG_TITLE,
} from '@/lib/settings/settings-form-messages'
import V2OverlayPortal from '@/components/betterbit-v2/settings/visual-v2/V2OverlayPortal'

interface Props {
  open: boolean
  onStay: () => void
  onLeave: () => void
}

export default function V2SettingsLeaveDialog({ open, onStay, onLeave }: Props) {
  return (
    <V2OverlayPortal
      open={open}
      onClose={onStay}
      className="v2-sv2-picker-overlay"
    >
      <div
        className="v2-settings-form-card w-full max-w-md p-4 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div>
          <p className="text-[16px] font-semibold" style={{ color: BB_V2.text.primary }}>
            {LEAVE_DIALOG_TITLE}
          </p>
          <p className="text-[14px] mt-2 leading-relaxed" style={{ color: BB_V2.text.secondary }}>
            {LEAVE_DIALOG_BODY}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onStay}
            className="flex-1 py-3 rounded-full text-[15px]"
            style={{ backgroundColor: BB_V2.accent.green, color: '#fff', fontWeight: 600 }}
          >
            {LEAVE_DIALOG_STAY}
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="flex-1 py-3 rounded-full text-[15px]"
            style={{ backgroundColor: BB_V2.bg.pill, color: BB_V2.text.secondary, fontWeight: 600 }}
          >
            {LEAVE_DIALOG_LEAVE}
          </button>
        </div>
      </div>
    </V2OverlayPortal>
  )
}
