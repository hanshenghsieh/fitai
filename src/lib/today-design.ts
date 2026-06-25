/** @deprecated Import BB_V2 from @/lib/betterbit-v2 — kept for gradual migration */
import { BB_V2 } from './betterbit-v2'

export const TODAY = {
  bg: BB_V2.bg.canvas,
  card: BB_V2.bg.card,
  surface: BB_V2.bg.surface,
  text: BB_V2.text.primary,
  textSecondary: BB_V2.text.secondary,
  mocha: BB_V2.accent.orange,
  pillBg: BB_V2.bg.pill,
  pillActiveBg: BB_V2.accent.orange,
  pillActiveText: '#FFFFFF',
  cardShadow: BB_V2.shadow.card,
  thumbShadow: BB_V2.shadow.card,
  maxWidth: BB_V2.maxWidth,
  radiusCard: BB_V2.radius.card,
  radiusLogCard: BB_V2.radius.sheet,
  radiusBtnPrimary: BB_V2.radius.button,
  radiusBtnSecondary: BB_V2.radius.button,
  iconStroke: BB_V2.iconStroke,
  font: BB_V2.font,
} as const
