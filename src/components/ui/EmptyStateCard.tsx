'use client'

import Link from 'next/link'
import { BB_V2 } from '@/lib/betterbit-v2'
import BBCard from '@/components/ui/BBCard'

interface Props {
  title: string
  reason: string
  ctaLabel: string
  ctaHref: string
  className?: string
}

/** Unified empty state: what happened → why it's ok → next step */
export default function EmptyStateCard({ title, reason, ctaLabel, ctaHref, className = '' }: Props) {
  return (
    <BBCard className={`text-center py-10 ${className}`}>
      <p className="text-[17px] leading-snug" style={{ color: BB_V2.text.primary, fontWeight: 600 }}>
        {title}
      </p>
      <p className="text-[14px] mt-2 leading-relaxed px-2" style={{ color: BB_V2.text.secondary, fontWeight: 400 }}>
        {reason}
      </p>
      <Link
        href={ctaHref}
        className="inline-flex mt-6 h-12 px-8 items-center justify-center text-[15px] active:opacity-90"
        style={{
          borderRadius: BB_V2.radius.button,
          backgroundColor: BB_V2.accent.orange,
          color: '#FFFFFF',
          fontWeight: 600,
        }}
      >
        {ctaLabel}
      </Link>
    </BBCard>
  )
}
