// BetterBit Design System
// 再健一點 - 完整設計規範

export const colors = {
  // Primary - Fresh Green
  primary: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    300: '#6EE7B7',
    400: '#2DD4BF', // Main
    500: '#14B8A6',
    600: '#0D9488',
    700: '#047857',
    800: '#065F46',
    900: '#064E3B',
  },

  // Secondary - Sky Blue
  secondary: {
    50: '#F0F9FF',
    100: '#E0F2FE',
    200: '#BAE6FD',
    300: '#7DD3FC',
    400: '#38BDF8', // Main
    500: '#0EA5E9',
    600: '#0284C7',
    700: '#0369A1',
    800: '#075985',
    900: '#0C4A6E',
  },

  // Neutral - Soft Gray & White
  neutral: {
    0: '#FFFFFF',
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },

  // Semantic
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#0EA5E9',
  milestone: '#8B5CF6',
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
}

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 50,
}

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: 700,
    lineHeight: 1.2,
  },
  h2: {
    fontSize: 24,
    fontWeight: 600,
    lineHeight: 1.3,
  },
  h3: {
    fontSize: 18,
    fontWeight: 600,
    lineHeight: 1.4,
  },
  body: {
    fontSize: 16,
    fontWeight: 400,
    lineHeight: 1.5,
  },
  caption: {
    fontSize: 14,
    fontWeight: 400,
    lineHeight: 1.5,
  },
  label: {
    fontSize: 12,
    fontWeight: 500,
    lineHeight: 1.4,
  },
}

export const shadows = {
  sm: {
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  md: {
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  lg: {
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
  },
}

export const animations = {
  fast: 150,      // 按鈕點擊、複選框
  standard: 300,  // 頁面轉換、模態
  slow: 500,      // 成就動畫
}
