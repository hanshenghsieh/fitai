// BetterBit Design System — Phase 5.5 Brand Maturity
// MUJI calm · Oura trust · Headspace warmth · Apple restraint

export const colors = {
  bg: {
    canvas: '#F4F2EE',
    elevated: '#FCFBF9',
    muted: '#EAE7E1',
  },

  text: {
    primary: '#3A3835',
    secondary: '#6D6A65',
    tertiary: '#9A9690',
  },

  accent: {
    action: '#7A756D',
    actionHover: '#6A655E',
    actionSoft: 'rgba(122, 117, 109, 0.08)',
    sage: '#7D8B7A',
    sageSoft: 'rgba(125, 139, 122, 0.1)',
  },

  border: {
    subtle: '#E3E0DA',
    focus: '#7A756D',
  },

  state: {
    complete: '#7D8B7A',
    rest: '#9A9690',
    error: '#A65D55',
    errorBg: '#F5EDEC',
  },
} as const

/** @deprecated Use colors.bg.* */
export const legacy = {
  background: colors.bg.canvas,
  card: colors.bg.elevated,
  cardMuted: colors.bg.muted,
  accent: colors.accent.action,
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
} as const

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 18,
  card: 18,
  full: 9999,
} as const

export const typography = {
  display: { fontSize: 28, fontWeight: 500, lineHeight: 1.25, letterSpacing: '-0.02em' },
  title: { fontSize: 22, fontWeight: 500, lineHeight: 1.3, letterSpacing: '-0.01em' },
  headline: { fontSize: 17, fontWeight: 500, lineHeight: 1.35 },
  body: { fontSize: 15, fontWeight: 400, lineHeight: 1.55 },
  caption: { fontSize: 13, fontWeight: 400, lineHeight: 1.45 },
  micro: { fontSize: 11, fontWeight: 500, lineHeight: 1.35, letterSpacing: '0.02em' },
} as const

export const motion = {
  fast: 180,
  standard: 320,
  slow: 480,
  easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
} as const

/** Card — restrained radius, border not shadow */
export const cardStyle = {
  backgroundColor: colors.bg.elevated,
  border: `1px solid ${colors.border.subtle}`,
  borderRadius: borderRadius.card,
} as const

export const buttonPrimary = {
  backgroundColor: colors.accent.action,
  color: colors.bg.elevated,
  borderRadius: borderRadius.lg,
  fontWeight: 500,
} as const

export const buttonGhost = {
  backgroundColor: colors.bg.muted,
  color: colors.text.secondary,
  borderRadius: borderRadius.lg,
  fontWeight: 500,
} as const
