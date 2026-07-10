'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Mail, Headphones, MessageSquare, Send, UploadCloud, Loader2 } from 'lucide-react'
import type { SettingsBundle } from '@/lib/app/settings-data'
import { SUPPORT_EMAIL } from '@/lib/support'
import { formatAppVersionLabel } from '@/lib/app-version'
import packageJson from '../../../../../package.json'
import V2SupportPageShell from '@/components/betterbit-v2/settings/visual-v2/V2SupportPageShell'
import V2SettingsVisualCard from '@/components/betterbit-v2/settings/visual-v2/V2SettingsVisualCard'
import {
  V2VisualChevronRow,
  V2VisualField,
  V2VisualInput,
  V2VisualPickerSheet,
  useVisualPicker,
  labelOf,
} from '@/components/betterbit-v2/settings/visual-v2/V2SettingsVisualPrimitives'

const ISSUE_TYPES = [
  { value: 'account', label: '帳號問題' },
  { value: 'billing', label: '付款問題' },
  { value: 'photo', label: '拍照辨識' },
  { value: 'food', label: '餐點資料' },
  { value: 'bug', label: 'Bug 回報' },
  { value: 'feature', label: '功能建議' },
  { value: 'other', label: '其他' },
]

const MAX_CONTENT = 500
const MIN_CONTENT = 10

export default function ContactSupportView({ initial }: { initial: SettingsBundle }) {
  const formRef = useRef<HTMLDivElement>(null)
  const { picker, openPicker, closePicker } = useVisualPicker()
  const [issueType, setIssueType] = useState('other')
  const [email, setEmail] = useState(initial.email ?? '')
  const [description, setDescription] = useState('')
  const [sending, setSending] = useState(false)

  const appInfo = `App 版本: ${formatAppVersionLabel(packageJson.version)}\n裝置: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'}`

  function scrollToForm(preset?: string) {
    if (preset) setIssueType(preset)
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function handleEmailSupport() {
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('BetterBit 客服')}`
  }

  function handleOnlineSupport() {
    toast.message('線上客服即將開放，請先使用 Email 聯絡我們。')
  }

  async function handleSubmit() {
    const trimmed = description.trim()
    if (trimmed.length < MIN_CONTENT) {
      toast.error(`請至少輸入 ${MIN_CONTENT} 字描述你的問題`)
      return
    }
    if (!email.trim()) {
      toast.error('請輸入 Email')
      return
    }

    setSending(true)
    try {
      const subject = encodeURIComponent(
        `BetterBit 客服 - ${ISSUE_TYPES.find(t => t.value === issueType)?.label ?? '其他'}`
      )
      const body = encodeURIComponent(
        `問題類型: ${labelOf(ISSUE_TYPES, issueType)}\nEmail: ${email.trim()}\n\n${trimmed}\n\n---\n${appInfo}`
      )
      window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`
      toast.success('已為你開啟郵件 App，請按下寄出完成提交')
    } catch {
      toast.error('送出失敗，請稍後再試')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <V2SupportPageShell
        title="聯絡客服"
        subtitle="我們隨時為你提供協助"
        footer={
          <>
            <button
              type="button"
              disabled={sending}
              onClick={() => void handleSubmit()}
              className="v2-sv2-btn-primary touch-manipulation"
            >
              {sending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
              {sending ? '送出中...' : '送出訊息'}
            </button>
            <p className="text-[12px] text-center leading-relaxed" style={{ color: '#7a807a' }}>
              我們會盡快回覆你，謝謝你的耐心等待！
            </p>
          </>
        }
      >
        <V2SettingsVisualCard icon={<Headphones className="h-4 w-4" />} title="客服方式" staggerIndex={0}>
          <V2VisualChevronRow
            icon={<Mail className="h-4 w-4" />}
            label="Email 客服"
            subtitle={SUPPORT_EMAIL}
            onClick={handleEmailSupport}
          />
          <V2VisualChevronRow
            icon={<Headphones className="h-4 w-4" />}
            label="線上客服"
            subtitle="平均回覆時間：即時～2 小時"
            onClick={handleOnlineSupport}
          />
          <V2VisualChevronRow
            icon={<MessageSquare className="h-4 w-4" />}
            label="回饋建議"
            subtitle="告訴我們你的想法與建議"
            onClick={() => scrollToForm('feature')}
          />
        </V2SettingsVisualCard>

        <div ref={formRef}>
          <V2SettingsVisualCard icon={<MessageSquare className="h-4 w-4" />} title="聯絡表單" staggerIndex={1}>
            <V2VisualField label="主題">
              <button
                type="button"
                onClick={() =>
                  openPicker({
                    key: 'issue',
                    title: '請選擇聯絡主題',
                    options: ISSUE_TYPES,
                    value: issueType,
                    onSelect: setIssueType,
                  })
                }
                className="v2-sv2-input w-full text-left flex items-center justify-between touch-manipulation"
                style={{ color: issueType ? '#123d24' : '#7a807a' }}
              >
                <span>{labelOf(ISSUE_TYPES, issueType) || '請選擇聯絡主題'}</span>
                <span style={{ color: '#7a807a' }}>▾</span>
              </button>
            </V2VisualField>

            <V2VisualField label="內容">
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value.slice(0, MAX_CONTENT))}
                placeholder="請詳細描述你的問題或需求..."
                rows={5}
                className="v2-sv2-input resize-none"
              />
              <p className="v2-sv2-char-count">
                {description.length}/{MAX_CONTENT}
              </p>
            </V2VisualField>

            <V2VisualField label="Email">
              <V2VisualInput value={email} onChange={setEmail} type="email" placeholder="你的 Email" />
            </V2VisualField>

            <V2VisualField label="附加圖片（選填）">
              <div className="v2-sv2-upload-zone v2-sv2-upload-zone--disabled" aria-disabled>
                <UploadCloud className="h-8 w-8" style={{ color: '#2f8f35' }} />
                <span className="font-semibold" style={{ color: '#123d24' }}>
                  點擊上傳圖片
                </span>
                <span className="text-[12px]">支援 JPG、PNG，最多 3 張（即將開放）</span>
              </div>
            </V2VisualField>

            <p className="text-[11px] leading-relaxed mt-2" style={{ color: '#7a807a' }}>
              目前使用 mailto 安全提交（尚無 support API）。按下送出後會開啟你的郵件 App，請確認寄出。
            </p>
          </V2SettingsVisualCard>
        </div>
      </V2SupportPageShell>

      {picker && (
        <V2VisualPickerSheet
          open
          title={picker.title}
          options={picker.options}
          value={picker.value}
          onSelect={picker.onSelect}
          onClose={closePicker}
        />
      )}
    </>
  )
}
