'use client'

import { TODAY } from '@/lib/today-design'

interface Props {
  line: string
}

export default function TodayPosture({ line }: Props) {
  return (
    <div className="px-5 pb-5 max-w-[640px] mx-auto" style={{ fontFamily: TODAY.font }}>
      <p
        className="text-[15px] leading-[1.65]"
        style={{ color: TODAY.textSecondary, fontWeight: 400 }}
      >
        {line}
      </p>
    </div>
  )
}
