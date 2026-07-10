'use client'

interface Props {
  checked: boolean
  disabled?: boolean
  onChange?: (checked: boolean) => void
}

export default function V2SettingsSwitch({ checked, disabled, onChange }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className="v2-settings-switch shrink-0 relative inline-flex h-[30px] w-[50px] items-center rounded-full transition-colors duration-[180ms] disabled:opacity-45"
      style={{
        backgroundColor: checked ? '#2f8f35' : '#d1d5db',
      }}
    >
      <span
        className="inline-block h-[26px] w-[26px] rounded-full bg-white shadow-sm transition-transform duration-[180ms]"
        style={{
          transform: checked ? 'translateX(22px)' : 'translateX(2px)',
        }}
      />
    </button>
  )
}
