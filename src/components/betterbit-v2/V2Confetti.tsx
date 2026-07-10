'use client'

import { useEffect, useMemo, useState } from 'react'

interface Particle {
  id: number
  left: number
  delay: number
  duration: number
  size: number
  color: string
  rotate: number
}

const COLORS = ['#52A855', '#7BC47E', '#E8D5A3', '#A8D8EA', '#C8E6C9']

export default function V2Confetti({ active = true }: { active?: boolean }) {
  const [visible, setVisible] = useState(active)
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: 26 }, (_, id) => ({
      id,
      left: 8 + Math.random() * 84,
      delay: Math.random() * 0.25,
      duration: 0.9 + Math.random() * 0.5,
      size: 5 + Math.random() * 5,
      color: COLORS[id % COLORS.length]!,
      rotate: Math.random() * 360,
    }))
  }, [])

  useEffect(() => {
    if (!active) return
    setVisible(true)
    const timer = window.setTimeout(() => setVisible(false), 1200)
    return () => window.clearTimeout(timer)
  }, [active])

  if (!visible) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-[80] overflow-hidden" aria-hidden>
      {particles.map(p => (
        <span
          key={p.id}
          className="v2-confetti-particle absolute top-[18%]"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.55,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  )
}
