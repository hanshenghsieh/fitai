/** BetterBit Visual V2 — single source of truth (1:1 design clone) */

export const BB_V2 = {
  bg: {
    canvas: '#FDFCF8',
    gradient:
      'radial-gradient(ellipse 130% 90% at -5% -10%, rgba(120, 190, 120, 0.14) 0%, transparent 52%), radial-gradient(ellipse 80% 60% at 100% 0%, rgba(120, 190, 120, 0.06) 0%, transparent 45%)',
    card: '#FFFFFF',
    surface: '#F4FAF4',
    pill: '#EEF6EE',
    softGreen: '#E8F5E9',
    header: '#FFFFFF',
  },
  text: {
    primary: '#1A2E1A',
    secondary: '#6B7280',
    muted: '#9CA3AF',
    deepGreen: '#2D4A3E',
  },
  accent: {
    /** @deprecated use green.primary — kept for gradual migration */
    orange: '#52A855',
    orangeLight: '#7BC47E',
    green: '#52A855',
    greenDeep: '#2D4A3E',
    greenSoft: '#E8F5E9',
    greenSoftBorder: '#C8E6C9',
    fat: '#E07A52',
    carbs: '#D4A017',
    protein: '#52A855',
    warning: '#E67E22',
  },
  divider: 'rgba(45, 74, 62, 0.08)',
  border: 'rgba(45, 74, 62, 0.08)',
  radius: {
    card: 28,
    cardLg: 24,
    button: 999,
    input: 16,
    sheet: 32,
    pill: 999,
  },
  shadow: {
    card: '0 4px 24px rgba(45, 74, 62, 0.06)',
    soft: '0 2px 12px rgba(45, 74, 62, 0.04)',
    fab: '0 6px 20px rgba(82, 168, 85, 0.35)',
    button: '0 4px 16px rgba(82, 168, 85, 0.28)',
  },
  macro: {
    protein: '#52A855',
    carbs: '#D4A017',
    fat: '#E07A52',
    fiber: '#7BC47E',
  },
  ring: {
    strokeWidth: 10,
    track: 'rgba(82, 168, 85, 0.18)',
    fill: '#52A855',
  },
  nav: {
    height: 56,
    fabSize: 56,
  },
  font: 'var(--font-noto-tc), -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
  iconStroke: 1.75,
  maxWidth: 640,
  pagePadding: 18,
  sectionGap: 16,
  type: {
    pageTitle: { size: 22, weight: 700, lineHeight: 1.25 },
    heroNumber: { size: 40, weight: 700, lineHeight: 1.05 },
    sectionTitle: { size: 17, weight: 700, lineHeight: 1.35 },
    body: { size: 15, weight: 400, lineHeight: 1.55 },
    caption: { size: 13, weight: 400, lineHeight: 1.45 },
    micro: { size: 11, weight: 500, lineHeight: 1.35 },
    number: { size: 28, weight: 700, lineHeight: 1.1 },
  },
  motion: {
    countUpMs: 800,
    fadeMs: 280,
  },
} as const

export type BBV2 = typeof BB_V2
