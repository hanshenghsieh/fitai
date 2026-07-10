'use client'

import { BB_V2 } from '@/lib/betterbit-v2'

interface Props {
  label: string
  helper?: string
  error?: string
  required?: boolean
  children: React.ReactNode
}

export default function V2SettingsField({ label, helper, error, required, children }: Props) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[14px]" style={{ color: BB_V2.text.primary, fontWeight: 600 }}>
        {label}
        {required && <span style={{ color: '#e05252' }}> *</span>}
      </span>
      {children}
      {helper && !error && (
        <p className="text-[12px] leading-relaxed" style={{ color: BB_V2.text.secondary }}>
          {helper}
        </p>
      )}
      {error && (
        <p className="text-[12px]" style={{ color: '#e05252' }}>
          {error}
        </p>
      )}
    </label>
  )
}

export function V2SettingsInput({
  value,
  onChange,
  type = 'text',
  placeholder,
  disabled,
  readOnly,
  min,
  max,
  step,
}: {
  value: string | number
  onChange?: (v: string) => void
  type?: string
  placeholder?: string
  disabled?: boolean
  readOnly?: boolean
  min?: number
  max?: number
  step?: number | string
}) {
  return (
    <input
      type={type}
      value={value}
      readOnly={readOnly}
      disabled={disabled}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
      onChange={e => onChange?.(e.target.value)}
      className={`v2-settings-input w-full px-3.5 py-3 rounded-xl text-[15px] outline-none ${disabled ? 'opacity-50' : ''}`}
      style={{
        backgroundColor: readOnly || disabled ? BB_V2.bg.pill : '#FFFFFF',
        color: BB_V2.text.primary,
        border: `1px solid ${BB_V2.divider}`,
      }}
    />
  )
}

export function V2SettingsSelect({
  value,
  onChange,
  options,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string; disabled?: boolean }[]
  disabled?: boolean
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={e => onChange(e.target.value)}
      className={`v2-settings-input w-full px-3.5 py-3 rounded-xl text-[15px] outline-none appearance-none ${disabled ? 'opacity-50' : ''}`}
      style={{
        backgroundColor: disabled ? BB_V2.bg.pill : '#FFFFFF',
        color: BB_V2.text.primary,
        border: `1px solid ${BB_V2.divider}`,
      }}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

export function V2SettingsTextarea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className="v2-settings-input w-full px-3.5 py-3 rounded-xl text-[15px] outline-none resize-none"
      style={{
        backgroundColor: '#FFFFFF',
        color: BB_V2.text.primary,
        border: `1px solid ${BB_V2.divider}`,
      }}
    />
  )
}
