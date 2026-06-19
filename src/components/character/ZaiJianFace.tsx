import type { ZaiJianExpression } from '@/lib/copy/zaijian'

interface Props {
  expression: ZaiJianExpression
  className?: string
}

/** 再健臉部 — 扁平極簡 SVG，對齊官方角色風格 */
export default function ZaiJianFace({ expression, className = '' }: Props) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      aria-hidden
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 身體 */}
      <ellipse cx="50" cy="58" rx="38" ry="34" fill="#FFFDF9" stroke="#2B2B2B" strokeWidth="2" />

      {/* 手 — 部分表情 */}
      {(expression === 'proud' || expression === 'cheat') && (
        <>
          <ellipse cx="18" cy="62" rx="7" ry="5" fill="#FFFDF9" stroke="#2B2B2B" strokeWidth="1.5" />
          <ellipse cx="82" cy="62" rx="7" ry="5" fill="#FFFDF9" stroke="#2B2B2B" strokeWidth="1.5" />
        </>
      )}

      {/* 表情層 */}
      <FaceFeatures expression={expression} />
    </svg>
  )
}

function FaceFeatures({ expression }: { expression: ZaiJianExpression }) {
  const stroke = '#2B2B2B'
  const sw = 2

  switch (expression) {
    case 'eye-roll':
      return (
        <>
          <path d="M36 42 Q40 38 44 42" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <path d="M56 42 Q60 38 64 42" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <line x1="42" y1="58" x2="58" y2="58" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </>
      )
    case 'proud':
      return (
        <>
          <rect x="30" y="40" width="18" height="6" rx="2" fill="#2B2B2B" opacity="0.85" />
          <rect x="52" y="40" width="18" height="6" rx="2" fill="#2B2B2B" opacity="0.85" />
          <path d="M42 58 Q50 64 58 58" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </>
      )
    case 'sleepy':
    case 'moon':
      return (
        <>
          <path d="M36 44 Q40 46 44 44" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <path d="M56 44 Q60 46 64 44" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <line x1="44" y1="60" x2="56" y2="60" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          {expression === 'moon' && (
            <text x="68" y="36" fontSize="10" fill={stroke}>z</text>
          )}
        </>
      )
    case 'hungry':
      return (
        <>
          <circle cx="40" cy="44" r="2.5" fill={stroke} />
          <circle cx="60" cy="44" r="2.5" fill={stroke} />
          <ellipse cx="50" cy="60" rx="5" ry="4" stroke={stroke} strokeWidth={sw} />
        </>
      )
    case 'coffee':
      return (
        <>
          <circle cx="40" cy="44" r="2" fill={stroke} />
          <circle cx="60" cy="44" r="2" fill={stroke} />
          <line x1="43" y1="58" x2="57" y2="58" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <rect x="72" y="48" width="10" height="14" rx="2" stroke={stroke} strokeWidth="1.5" fill="#E8DED1" />
        </>
      )
    case 'workout':
      return (
        <>
          <circle cx="40" cy="44" r="2.5" fill={stroke} />
          <circle cx="60" cy="44" r="2.5" fill={stroke} />
          <path d="M44 58 Q50 54 56 58" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <ellipse cx="50" cy="28" rx="14" ry="4" stroke={stroke} strokeWidth="1.5" fill="#E8DED1" />
        </>
      )
    case 'tired':
      return (
        <>
          <path d="M36 45 L44 43" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <path d="M56 43 L64 45" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <path d="M44 60 Q50 56 56 60" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <circle cx="72" cy="38" r="3" fill="#B8895B" opacity="0.5" />
        </>
      )
    case 'plateau':
    case 'suspicious':
      return (
        <>
          <circle cx="40" cy="44" r="2" fill={stroke} />
          <circle cx="60" cy="44" r="2" fill={stroke} />
          <line x1="46" y1="60" x2="54" y2="58" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </>
      )
    case 'cheat':
      return (
        <>
          <circle cx="40" cy="44" r="2.5" fill={stroke} />
          <circle cx="60" cy="44" r="2.5" fill={stroke} />
          <path d="M42 58 Q50 62 58 58" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <circle cx="72" cy="50" r="4" fill="#E8A0A0" opacity="0.6" />
        </>
      )
    case 'water':
      return (
        <>
          <circle cx="40" cy="44" r="2.5" fill={stroke} />
          <circle cx="60" cy="44" r="2.5" fill={stroke} />
          <line x1="43" y1="58" x2="57" y2="58" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <path d="M28 50 Q28 42 32 38 Q36 42 36 50 Q36 56 32 58 Q28 56 28 50" fill="#B8895B" opacity="0.5" />
        </>
      )
    default:
      return (
        <>
          <circle cx="40" cy="44" r="2.5" fill={stroke} />
          <circle cx="60" cy="44" r="2.5" fill={stroke} />
          <line x1="43" y1="58" x2="57" y2="58" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </>
      )
  }
}
