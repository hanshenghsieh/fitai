import type { ZaiJianExpression } from '@/lib/copy/zaijian'
import { colors } from '@/lib/design-system'

interface Props {
  expression: ZaiJianExpression
  className?: string
}

/** 再健 — 扁平 SVG 角色（帽 T 參考圖僅作風格，非 LOGO） */
export default function ZaiJianFace({ expression, className = '' }: Props) {
  const stroke = colors.text.primary
  const fill = colors.bg.elevated
  const hoodie = colors.bg.muted

  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      aria-hidden
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 帽 T 連帽 */}
      <path
        d="M22 52 Q50 18 78 52 L72 58 Q50 32 28 58 Z"
        fill={hoodie}
        stroke={stroke}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M30 58 Q50 48 70 58"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.5"
      />

      {/* 身體 */}
      <ellipse cx="50" cy="68" rx="34" ry="26" fill={fill} stroke={stroke} strokeWidth="1.8" />

      <FaceFeatures expression={expression} stroke={stroke} />
    </svg>
  )
}

function FaceFeatures({ expression, stroke }: { expression: ZaiJianExpression; stroke: string }) {
  const sw = 2

  switch (expression) {
    case 'eye-roll':
      return (
        <>
          <path d="M36 52 Q40 48 44 52" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <path d="M56 52 Q60 48 64 52" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <line x1="42" y1="68" x2="58" y2="68" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </>
      )
    case 'proud':
      return (
        <>
          <rect x="30" y="50" width="18" height="5" rx="2" fill={stroke} opacity="0.8" />
          <rect x="52" y="50" width="18" height="5" rx="2" fill={stroke} opacity="0.8" />
          <path d="M42 68 Q50 74 58 68" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </>
      )
    case 'sleepy':
    case 'moon':
      return (
        <>
          <path d="M36 54 Q40 56 44 54" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <path d="M56 54 Q60 56 64 54" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <line x1="44" y1="70" x2="56" y2="70" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          {expression === 'moon' && (
            <text x="68" y="46" fontSize="10" fill={stroke}>z</text>
          )}
        </>
      )
    case 'hungry':
      return (
        <>
          <circle cx="40" cy="54" r="2.5" fill={stroke} />
          <circle cx="60" cy="54" r="2.5" fill={stroke} />
          <ellipse cx="50" cy="70" rx="5" ry="4" stroke={stroke} strokeWidth={sw} />
        </>
      )
    case 'coffee':
      return (
        <>
          <circle cx="40" cy="54" r="2" fill={stroke} />
          <circle cx="60" cy="54" r="2" fill={stroke} />
          <line x1="43" y1="68" x2="57" y2="68" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <rect x="72" y="58" width="10" height="12" rx="2" stroke={stroke} strokeWidth="1.5" fill={colors.bg.muted} />
        </>
      )
    case 'workout':
      return (
        <>
          <circle cx="40" cy="54" r="2.5" fill={stroke} />
          <circle cx="60" cy="54" r="2.5" fill={stroke} />
          <path d="M44 68 Q50 64 56 68" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </>
      )
    case 'tired':
      return (
        <>
          <path d="M36 55 L44 53" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <path d="M56 53 L64 55" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <path d="M44 70 Q50 66 56 70" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </>
      )
    case 'plateau':
    case 'suspicious':
      return (
        <>
          <circle cx="40" cy="54" r="2" fill={stroke} />
          <circle cx="60" cy="54" r="2" fill={stroke} />
          <line x1="46" y1="70" x2="54" y2="68" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </>
      )
    case 'cheat':
      return (
        <>
          <circle cx="40" cy="54" r="2.5" fill={stroke} />
          <circle cx="60" cy="54" r="2.5" fill={stroke} />
          <path d="M42 68 Q50 72 58 68" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </>
      )
    case 'water':
      return (
        <>
          <circle cx="40" cy="54" r="2.5" fill={stroke} />
          <circle cx="60" cy="54" r="2.5" fill={stroke} />
          <line x1="43" y1="68" x2="57" y2="68" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </>
      )
    default:
      return (
        <>
          <circle cx="40" cy="54" r="2.5" fill={stroke} />
          <circle cx="60" cy="54" r="2.5" fill={stroke} />
          <line x1="43" y1="68" x2="57" y2="68" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </>
      )
  }
}
