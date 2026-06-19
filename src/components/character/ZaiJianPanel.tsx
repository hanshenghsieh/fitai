'use client'

import { pickZaiJianLine, zaijian } from '@/lib/copy/zaijian'
import ZaiJian from '@/components/character/ZaiJian'
import { colors } from '@/lib/design-system'

interface Props {
  moment?: 'empty' | 'loading' | 'error'
  children?: React.ReactNode
}

export default function ZaiJianPanel({ moment = 'empty', children }: Props) {
  const line =
    moment === 'loading'
      ? pickZaiJianLine('loading')
      : moment === 'error'
        ? pickZaiJianLine('error')
        : pickZaiJianLine('empty')

  return (
    <div
      className="m-4 p-8 rounded-3xl text-center space-y-6"
      style={{ backgroundColor: colors.bg.elevated, border: `1px solid ${colors.border.subtle}` }}
    >
      <ZaiJian size="lg" line={line} breathe={moment === 'loading'} />
      {moment === 'loading' && (
        <p className="text-[13px]" style={{ color: colors.text.tertiary }}>{zaijian.generating}</p>
      )}
      {children}
    </div>
  )
}
