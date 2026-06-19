// BetterBit Design System — 再健一點
// Calm · Warm · Premium · Execution-first

export const colors = {
  bg: {
    canvas: '#F7F3EC',
    elevated: '#FFFDF9',
    muted: '#E8DED1',
  },

  text: {
    primary: '#2B2B2B',
    secondary: '#6B6560',
    tertiary: '#9C958D',
  },

  accent: {
    action: '#B8895B',
    actionHover: '#A6784E',
    actionSoft: 'rgba(184, 137, 91, 0.08)',
  },

  border: {
    subtle: '#E8DED1',
    focus: '#B8895B',
  },

  state: {
    complete: '#B8895B',
    rest: '#9C958D',
    error: '#C4483C',
    errorBg: '#FFE4E4',
  },
} as const

/** @deprecated Use colors.bg.* — kept for gradual migration */
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
} as const

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
} as const

export const typography = {
  display: { fontSize: 28, fontWeight: 600, lineHeight: 1.2 },
  title: { fontSize: 22, fontWeight: 600, lineHeight: 1.25 },
  headline: { fontSize: 17, fontWeight: 600, lineHeight: 1.3 },
  body: { fontSize: 15, fontWeight: 400, lineHeight: 1.5 },
  caption: { fontSize: 13, fontWeight: 400, lineHeight: 1.4 },
  micro: { fontSize: 11, fontWeight: 500, lineHeight: 1.3 },
} as const

export const motion = {
  fast: 150,
  standard: 300,
  slow: 500,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
} as const

/** Card surface — border over shadow */
export const cardStyle = {
  backgroundColor: colors.bg.elevated,
  border: `1px solid ${colors.border.subtle}`,
} as const
