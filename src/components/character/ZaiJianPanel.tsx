'use client'

import { pickZaiJianLine, zaijian } from '@/lib/copy/zaijian'
import ZaiJian from '@/components/character/ZaiJian'
import { colors, cardStyle } from '@/lib/design-system'

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
    <div className="m-5 p-8 space-y-6 text-center" style={cardStyle}>
      <ZaiJian
        size="md"
        line={line}
        layout={moment === 'empty' ? 'stack' : 'whisper'}
        showFace={moment === 'empty'}
        breathe={moment === 'loading'}
        className={moment === 'empty' ? 'mx-auto max-w-xs' : ''}
      />
      {moment === 'loading' && (
        <p className="text-[13px]" style={{ color: colors.text.tertiary }}>{zaijian.generating}</p>
      )}
      {children}
    </div>
  )
}
