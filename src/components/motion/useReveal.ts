'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'

export function useReveal(staggerIndex = 0) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setVisible(true)
      return
    }

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true)
          obs.disconnect()
        }
      },
      { threshold: 0.06, rootMargin: '0px 0px -4% 0px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return {
    ref,
    className: visible ? 'mi-reveal mi-reveal--in' : 'mi-reveal',
    style: { '--mi-delay': `${staggerIndex * 0.08}s` } as CSSProperties,
  }
}
