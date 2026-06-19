'use client'

import { useState, type ReactNode, type MouseEvent } from 'react'
import { colors } from '@/lib/design-system'

interface Props {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  className?: string
}

export default function DecideButton({ children, onClick, disabled, className = '' }: Props) {
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([])

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (disabled) return
    const rect = e.currentTarget.getBoundingClientRect()
    const id = Date.now()
    setRipples(prev => [
      ...prev,
      { id, x: e.clientX - rect.left, y: e.clientY - rect.top },
    ])
    window.setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== id))
    }, 420)
    onClick()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`mi-decide-btn w-full py-4 rounded-2xl text-base font-semibold disabled:opacity-50 ${className}`}
      style={{ backgroundColor: colors.accent.action, color: '#FFFDF9' }}
    >
      {ripples.map(r => (
        <span
          key={r.id}
          className="mi-decide-btn__ripple"
          style={{ left: r.x, top: r.y }}
        />
      ))}
      <span className="relative z-[1] inline-flex items-center justify-center gap-2">
        {children}
      </span>
    </button>
  )
}
