/** BetterBit v2 — Apple Health / Fitness visual system (single source of truth) */

export const BB_V2 = {
  bg: {
    canvas: '#FFF9F2',
    card: '#FFFFFF',
    surface: '#FFF4E8',
    pill: '#F5EDE3',
  },
  text: {
    primary: '#1C1C1E',
    secondary: '#6E6E73',
  },
  accent: {
    orange: '#D89A52',
    orangeLight: '#E7BC84',
    green: '#76B69A',
    fat: '#E07A52',
  },
  divider: 'rgba(0,0,0,0.05)',
  radius: {
    card: 28,
    button: 22,
    input: 20,
    sheet: 32,
    pill: 999,
  },
  shadow: {
    card: '0 8px 30px rgba(0,0,0,0.06)',
    fab: '0 8px 24px rgba(216,154,82,0.35)',
  },
  macro: {
    protein: '#76B69A',
    carbs: '#D89A52',
    fat: '#E07A52',
  },
  ring: {
    strokeWidth: 12,
    track: 'rgba(216,154,82,0.15)',
    fill: '#D89A52',
  },
  nav: {
    height: 84,
    fabSize: 56,
  },
  font: 'var(--font-noto-tc), -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
  iconStroke: 1.75,
  maxWidth: 640,
  motion: {
    countUpMs: 1000,
    fadeMs: 320,
  },
} as const

export type BBV2 = typeof BB_V2
