// BetterBit Design System — Phase 5.5 Brand Maturity
// MUJI calm · Oura trust · Headspace warmth · Apple restraint
//
// @deprecated Prefer BB_V2 from @/lib/betterbit-v2 for new UI.
// This module remains for legacy imports; values are aligned to BB_V2.

import { BB_V2 } from './betterbit-v2'

export const colors = {
  bg: {
    canvas: BB_V2.bg.canvas,
    elevated: BB_V2.bg.card,
    muted: BB_V2.bg.surface,
  },

  text: {
    primary: BB_V2.text.primary,
    secondary: BB_V2.text.secondary,
    /** No BB_V2 equivalent — use for de-emphasized onboarding hints */
    tertiary: '#8E8E93',
  },

  accent: {
    action: BB_V2.accent.orange,
    actionHover: '#C88A42',
    actionSoft: 'rgba(216, 154, 82, 0.12)',
    sage: BB_V2.accent.green,
    sageSoft: 'rgba(118, 182, 154, 0.12)',
  },

  border: {
    subtle: BB_V2.divider,
    focus: BB_V2.accent.orange,
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
  xl: 20,
  card: BB_V2.radius.card,
  full: 9999,
} as const

export const typography = {
  display: { fontSize: BB_V2.type.pageTitle.size, fontWeight: BB_V2.type.pageTitle.weight, lineHeight: BB_V2.type.pageTitle.lineHeight, letterSpacing: '-0.02em' },
  title: { fontSize: BB_V2.type.sectionTitle.size, fontWeight: BB_V2.type.sectionTitle.weight, lineHeight: BB_V2.type.sectionTitle.lineHeight, letterSpacing: '-0.01em' },
  headline: { fontSize: BB_V2.type.body.size, fontWeight: 500, lineHeight: 1.35 },
  body: { fontSize: BB_V2.type.body.size, fontWeight: BB_V2.type.body.weight, lineHeight: BB_V2.type.body.lineHeight },
  caption: { fontSize: BB_V2.type.caption.size, fontWeight: BB_V2.type.caption.weight, lineHeight: BB_V2.type.caption.lineHeight },
  micro: { fontSize: BB_V2.type.micro.size, fontWeight: BB_V2.type.micro.weight, lineHeight: BB_V2.type.micro.lineHeight, letterSpacing: '0.02em' },
} as const

export const motion = {
  fast: 180,
  standard: 320,
  slow: 480,
  easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
} as const

/** Card — v2: white, 28px, soft shadow (aligned to BB_V2) */
export const cardStyle = {
  backgroundColor: BB_V2.bg.card,
  borderRadius: BB_V2.radius.card,
  boxShadow: BB_V2.shadow.card,
} as const

export const buttonPrimary = {
  backgroundColor: BB_V2.accent.orange,
  color: '#FFFFFF',
  borderRadius: BB_V2.radius.button,
  fontWeight: 600,
} as const

export const buttonGhost = {
  backgroundColor: BB_V2.bg.surface,
  color: BB_V2.text.secondary,
  borderRadius: BB_V2.radius.input,
  fontWeight: 500,
} as const
