'use client'

import { useState, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import V2SettingsSwitch from '@/components/betterbit-v2/settings/V2SettingsSwitch'
import V2OverlayPortal from '@/components/betterbit-v2/settings/visual-v2/V2OverlayPortal'

export function V2VisualField({
  label,
  helper,
  children,
}: {
  label: string
  helper?: string
  children: ReactNode
}) {
  return (
    <div className="v2-sv2-field">
      <div className="v2-sv2-field-label">{label}</div>
      {children}
      {helper && (
        <p className="text-[12px] mt-2 leading-relaxed" style={{ color: '#7a807a' }}>
          {helper}
        </p>
      )}
    </div>
  )
}

export function V2VisualInput({
  value,
  onChange,
  type = 'text',
  readOnly,
  disabled,
  placeholder,
  className = '',
}: {
  value: string
  onChange?: (v: string) => void
  type?: string
  readOnly?: boolean
  disabled?: boolean
  placeholder?: string
  className?: string
}) {
  return (
    <input
      type={type}
      value={value}
      readOnly={readOnly}
      disabled={disabled}
      placeholder={placeholder}
      onChange={e => onChange?.(e.target.value)}
      className={`v2-sv2-input ${readOnly || disabled ? 'v2-sv2-input--readonly' : ''} ${className}`}
    />
  )
}

export function V2VisualSegment({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="v2-sv2-segment">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`v2-sv2-segment-btn touch-manipulation ${value === opt.value ? 'v2-sv2-segment-btn--active' : ''}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export function V2VisualChevronRow({
  icon,
  label,
  value,
  subtitle,
  onClick,
}: {
  icon: ReactNode
  label: string
  value?: string
  subtitle?: string
  onClick?: () => void
}) {
  return (
    <button type="button" onClick={onClick} className="v2-sv2-row touch-manipulation">
      <div className="v2-sv2-row-icon">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="v2-sv2-row-label">{label}</div>
        {subtitle && <div className="v2-sv2-row-sub">{subtitle}</div>}
      </div>
      {value && <span className="v2-sv2-row-value shrink-0">{value}</span>}
      {onClick && <ChevronRight className="h-4 w-4 v2-sv2-row-chevron shrink-0" />}
    </button>
  )
}

export function V2VisualGoalRow({
  icon,
  label,
  value,
  onChange,
  type = 'text',
  readOnly,
}: {
  icon: ReactNode
  label: string
  value: string
  onChange?: (v: string) => void
  type?: string
  readOnly?: boolean
}) {
  return (
    <div className="v2-sv2-goal-row">
      <div className="v2-sv2-row-icon">{icon}</div>
      <span className="v2-sv2-row-label flex-1">{label}</span>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        disabled={readOnly}
        onChange={e => onChange?.(e.target.value)}
        className="v2-sv2-goal-input"
      />
    </div>
  )
}

export function V2VisualPickerSheet({
  open,
  title,
  options,
  value,
  onSelect,
  onClose,
}: {
  open: boolean
  title: string
  options: { value: string; label: string }[]
  value: string
  onSelect: (v: string) => void
  onClose: () => void
}) {
  if (!open) return null
  return (
    <V2OverlayPortal open={open} onClose={onClose}>
      <div className="v2-sv2-picker-sheet" onClick={e => e.stopPropagation()}>
        <p className="text-[16px] font-bold mb-3" style={{ color: '#123d24' }}>
          {title}
        </p>
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              onSelect(opt.value)
              onClose()
            }}
            className={`v2-sv2-picker-option touch-manipulation ${value === opt.value ? 'v2-sv2-picker-option--active' : ''}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </V2OverlayPortal>
  )
}

export function useVisualPicker() {
  const [picker, setPicker] = useState<{ key: string; title: string; options: { value: string; label: string }[]; value: string; onSelect: (v: string) => void } | null>(null)
  return {
    picker,
    openPicker: (p: typeof picker) => setPicker(p),
    closePicker: () => setPicker(null),
  }
}

export function V2VisualPaceCard({
  icon,
  title,
  subtitle,
  description,
  weeklyLoss,
  dailyKcal,
  selected,
  onSelect,
}: {
  icon: ReactNode
  title: string
  subtitle: string
  description: string
  weeklyLoss: string
  dailyKcal: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`v2-sv2-pace-card touch-manipulation ${selected ? 'v2-sv2-pace-card--selected' : ''}`}
    >
      <div className="flex items-start gap-3">
        <div className="v2-sv2-row-icon mt-0.5">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[16px] font-bold" style={{ color: '#123d24' }}>
                {title}
              </p>
              <p className="text-[13px] mt-0.5 font-semibold" style={{ color: '#123d24' }}>
                {subtitle}
              </p>
            </div>
            {selected && <span className="v2-sv2-pace-badge">已選</span>}
          </div>
          <p className="text-[12px] mt-1.5 leading-relaxed" style={{ color: '#7a807a' }}>
            {description}
          </p>
          <p className="text-[12px] mt-2" style={{ color: '#7a807a' }}>
            預估每週下降 {weeklyLoss}
          </p>
          <p className="text-[12px]" style={{ color: '#7a807a' }}>
            每日目標約 {dailyKcal}
          </p>
        </div>
        {selected && (
          <span
            className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-[12px]"
            style={{ backgroundColor: '#2f8f35' }}
          >
            ✓
          </span>
        )}
      </div>
    </button>
  )
}

export function V2VisualMetricTile({
  icon,
  label,
  value,
  unit,
  hint,
}: {
  icon: ReactNode
  label: string
  value: string
  unit: string
  hint?: string
}) {
  return (
    <div className="v2-sv2-metric-tile">
      <div className="flex items-start gap-2">
        <div className="v2-sv2-row-icon" style={{ width: 28, height: 28 }}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold" style={{ color: '#7a807a' }}>
            {label}
          </p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="v2-sv2-metric-value">{value}</span>
            <span className="v2-sv2-metric-unit">{unit}</span>
          </div>
          {hint && (
            <p className="text-[10px] mt-0.5" style={{ color: '#7a807a' }}>
              {hint}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export function V2VisualNutrientTile({
  icon,
  label,
  value,
  onChange,
  readOnly,
}: {
  icon: ReactNode
  label: string
  value: string
  onChange?: (v: string) => void
  readOnly?: boolean
}) {
  return (
    <div className="v2-sv2-nutrient-tile">
      <div className="v2-sv2-row-icon mx-auto mb-1.5" style={{ width: 28, height: 28 }}>
        {icon}
      </div>
      <p className="text-[11px] font-semibold mb-1" style={{ color: '#7a807a' }}>
        {label}
      </p>
      {readOnly ? (
        <p className="text-[18px] font-bold" style={{ color: '#123d24' }}>
          {value || '—'}
        </p>
      ) : (
        <input
          type="number"
          value={value}
          onChange={e => onChange?.(e.target.value)}
          className="v2-sv2-input text-center py-2 text-[16px] font-bold"
          style={{ padding: '8px 4px' }}
        />
      )}
    </div>
  )
}

export function V2VisualToggleRow({
  icon,
  label,
  helper,
  checked,
  disabled,
  onChange,
  center,
  onCenterClick,
}: {
  icon: ReactNode
  label: string
  helper?: string
  checked: boolean
  disabled?: boolean
  onChange: (v: boolean) => void
  center?: ReactNode
  onCenterClick?: () => void
}) {
  return (
    <div className="v2-sv2-toggle-row">
      <div className="v2-sv2-row-icon">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="v2-sv2-row-label">{label}</p>
        {helper && (
          <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: '#7a807a' }}>
            {helper}
          </p>
        )}
      </div>
      {center && (
        <button type="button" onClick={onCenterClick} className="v2-sv2-time-pill touch-manipulation shrink-0">
          {center}
        </button>
      )}
      <V2SettingsSwitch checked={checked} disabled={disabled} onChange={onChange} />
    </div>
  )
}

export function V2VisualInfoBar({ children }: { children: ReactNode }) {
  return (
    <div className="v2-sv2-info-bar">
      <span
        className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[12px] font-bold"
        style={{ backgroundColor: '#2f8f35', color: '#fff' }}
      >
        i
      </span>
      <span>{children}</span>
    </div>
  )
}

export function V2VisualChipGroup({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[]
  value: string[]
  onChange: (next: string[]) => void
}) {
  function toggle(v: string) {
    onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v])
  }

  return (
    <div className="v2-sv2-chip-grid">
      {options.map(opt => {
        const active = value.includes(opt.value)
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={`v2-sv2-chip touch-manipulation ${active ? 'v2-sv2-chip--active' : ''}`}
          >
            {opt.label}
            {active && <span className="v2-sv2-chip-check">✓</span>}
          </button>
        )
      })}
    </div>
  )
}

export function V2VisualTagInput({
  tags,
  onChange,
  placeholder = '+ 新增不想看到的食物',
}: {
  tags: string[]
  onChange: (next: string[]) => void
  placeholder?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  function addTag() {
    const next = draft.trim()
    if (!next) return
    if (!tags.includes(next)) onChange([...tags, next])
    setDraft('')
    setEditing(false)
  }

  function removeTag(tag: string) {
    onChange(tags.filter(t => t !== tag))
  }

  return (
    <div>
      {tags.length > 0 && (
        <div className="v2-sv2-tag-grid">
          {tags.map(tag => (
            <span key={tag} className="v2-sv2-tag">
              {tag}
              <button type="button" className="v2-sv2-tag-remove touch-manipulation" onClick={() => removeTag(tag)} aria-label={`移除 ${tag}`}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addTag()
            }
            if (e.key === 'Escape') {
              setEditing(false)
              setDraft('')
            }
          }}
          onBlur={() => {
            if (draft.trim()) addTag()
            else setEditing(false)
          }}
          placeholder="輸入食物名稱"
          className="v2-sv2-tag-input"
        />
      ) : (
        <button type="button" className="v2-sv2-tag-add touch-manipulation" onClick={() => setEditing(true)}>
          {placeholder}
        </button>
      )}
    </div>
  )
}

export function V2VisualSegmentField({
  label,
  helper,
  options,
  value,
  onChange,
}: {
  label: string
  helper?: string
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="v2-sv2-segment-field">
      <div className="v2-sv2-field-label">{label}</div>
      <V2VisualSegment options={options} value={value} onChange={onChange} />
      {helper && <p className="v2-sv2-card-helper">{helper}</p>}
    </div>
  )
}

export function V2VisualMultiPickerSheet({
  open,
  title,
  options,
  value,
  onSelect,
  onClose,
}: {
  open: boolean
  title: string
  options: { value: string; label: string }[]
  value: string[]
  onSelect: (next: string[]) => void
  onClose: () => void
}) {
  if (!open) return null

  function toggle(v: string) {
    onSelect(value.includes(v) ? value.filter(x => x !== v) : [...value, v])
  }

  return (
    <V2OverlayPortal open={open} onClose={onClose}>
      <div className="v2-sv2-picker-sheet" onClick={e => e.stopPropagation()}>
        <p className="text-[16px] font-bold mb-3" style={{ color: '#123d24' }}>
          {title}
        </p>
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={`v2-sv2-picker-option touch-manipulation ${value.includes(opt.value) ? 'v2-sv2-picker-option--active' : ''}`}
          >
            {opt.label}
            {value.includes(opt.value) ? ' ✓' : ''}
          </button>
        ))}
        <button type="button" onClick={onClose} className="v2-sv2-btn-secondary w-full mt-3 touch-manipulation">
          完成
        </button>
      </div>
    </V2OverlayPortal>
  )
}

export function V2VisualInterfacePreview() {
  return (
    <div className="v2-sv2-preview-card">
      <div className="v2-sv2-preview-mock">
        <p className="text-[8px] font-bold text-center" style={{ color: '#123d24' }}>
          BetterBit
        </p>
        <p className="text-[7px] text-center mt-1" style={{ color: '#7a807a' }}>
          蛋白質缺口
        </p>
        <p className="text-[14px] font-bold text-center" style={{ color: '#123d24' }}>
          28g
        </p>
        <div className="v2-sv2-preview-ring" />
        <p className="text-[8px] text-center font-semibold" style={{ color: '#2f8f35' }}>
          72%
        </p>
        <div className="v2-sv2-preview-macros">
          <div className="v2-sv2-preview-macro">蛋白</div>
          <div className="v2-sv2-preview-macro">碳水</div>
          <div className="v2-sv2-preview-macro">脂肪</div>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-bold" style={{ color: '#123d24' }}>
          預覽效果
        </p>
        <p className="text-[12px] mt-2 leading-relaxed" style={{ color: '#7a807a' }}>
          根據你的設定，首頁將以更適合你的方式呈現重點資訊。
        </p>
        <p className="text-[11px] mt-3 leading-relaxed" style={{ color: '#7a807a' }}>
          * 此為示意畫面，實際內容會依實際資料而異。
        </p>
      </div>
    </div>
  )
}

export function labelOf(options: { value: string; label: string }[], value: string): string {
  return options.find(o => o.value === value)?.label ?? value
}

export function labelsOf(options: { value: string; label: string }[], values: string[]): string {
  if (!values.length) return '—'
  return values.map(v => labelOf(options, v)).join('、')
}
