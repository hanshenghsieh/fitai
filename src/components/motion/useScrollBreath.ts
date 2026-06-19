'use client'

import { useEffect, useRef, useState } from 'react'

/** Depth 0–3 → max drift 2–8px at different scroll rates */
export function useScrollBreath(depth: 0 | 1 | 2 | 3 = 1) {
  const ref = useRef<HTMLDivElement>(null)
  const [offsetY, setOffsetY] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const maxPx = 2 + depth * 2
    const rate = 0.35 + depth * 0.15
    let raf = 0

    const update = () => {
      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight || 1
      const elementCenter = rect.top + rect.height * 0.5
      const normalized = (elementCenter - vh * 0.5) / vh
      const next = Math.max(-maxPx, Math.min(maxPx, normalized * maxPx * rate * 4))
      setOffsetY(next)
    }

    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [depth])

  return {
    ref,
    style: { transform: `translate3d(0, ${offsetY}px, 0)` } as const,
  }
}
