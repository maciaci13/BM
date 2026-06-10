// BeautyMatch design tokens — "apothecary lab"
// Porcelain base, ink-cocoa text, deep eucalyptus accent, blush highlight.
export const colors = {
  bg: '#FAF6F1',
  surface: '#FFFFFF',
  ink: '#2A211B',
  muted: '#8A7A6D',
  line: '#EBE2D8',
  accent: '#2F6B5E',       // eucalyptus
  accentSoft: '#E3EEE9',
  blush: '#F3DDD3',
  gold: '#C99A3F',
  warn: '#B3552E',
  warnSoft: '#F7E5DB',
  danger: '#9C2B2B',
  dangerSoft: '#F6E2E2',
  ok: '#2F6B5E',
};

export const radius = { sm: 10, md: 16, lg: 24, pill: 999 };

export const type = {
  display: { fontSize: 30, fontWeight: '700' as const, letterSpacing: -0.5, color: colors.ink },
  title: { fontSize: 21, fontWeight: '700' as const, letterSpacing: -0.3, color: colors.ink },
  h2: { fontSize: 17, fontWeight: '600' as const, color: colors.ink },
  body: { fontSize: 15, lineHeight: 22, color: colors.ink },
  small: { fontSize: 13, lineHeight: 18, color: colors.muted },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1.4,
    textTransform: 'uppercase' as const,
    color: colors.accent,
  },
};

export function matchColor(score: number) {
  if (score >= 75) return colors.accent;
  if (score >= 50) return colors.gold;
  return colors.warn;
}
