// Premium Medical Dark Design System
import { Platform } from 'react-native';

export const Colors = {
  // Core backgrounds — deep navy, not pure black
  bg: '#0A0F1E',
  bgGradientStart: '#0A0F1E',
  bgGradientEnd: '#0D1528',
  surface: '#111827',
  surfaceElevated: '#1A2335',
  surfaceHigh: '#243047',
  surfaceGlass: 'rgba(255,255,255,0.06)',
  surfaceGlassBorder: 'rgba(255,255,255,0.10)',

  // Borders
  border: 'rgba(255,255,255,0.08)',
  borderLight: 'rgba(255,255,255,0.12)',
  borderGlass: 'rgba(255,255,255,0.15)',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.75)',
  textMuted: 'rgba(255,255,255,0.40)',
  textOnAccent: '#FFFFFF',

  // Accent — electric blue
  accent: '#4F8EF7',
  accentBright: '#6BA3FF',
  accentDim: 'rgba(79,142,247,0.15)',
  accentGlow: 'rgba(79,142,247,0.30)',
  accentLight: '#93BBFF',

  // Semantic
  success: '#34D399',
  successDim: 'rgba(52,211,153,0.15)',
  danger: '#F87171',
  dangerDim: 'rgba(248,113,113,0.15)',
  warning: '#FBBF24',
  warningDim: 'rgba(251,191,36,0.15)',

  // Gradient stops
  gradBlue1: '#4F8EF7',
  gradBlue2: '#3B6FD4',
  gradGreen1: '#34D399',
  gradGreen2: '#059669',
  gradRed1: '#F87171',
  gradRed2: '#DC2626',

  // Compatibility aliases
  primary: '#111827',
  primaryDark: '#0A0F1E',
  primaryLight: '#4F8EF7',
  surfaceCard: '#111827',
  surfaceBorder: 'rgba(255,255,255,0.08)',
  surfaceElevated2: '#1A2335',
  gold: '#FBBF24',
  goldSurface: 'rgba(251,191,36,0.12)',
  partial: '#FBBF24',
  partialSurface: 'rgba(251,191,36,0.12)',
  warningSurface: 'rgba(251,191,36,0.12)',
  dangerSurface: 'rgba(248,113,113,0.12)',
  dangerLight: '#FCA5A5',
  successSurface: 'rgba(52,211,153,0.12)',
  textOnPrimary: '#FFFFFF',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 36,
  full: 999,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
  xxxl: 34,
};

// Glass morphism helper
export const glassStyle = {
  backgroundColor: Colors.surfaceGlass,
  borderWidth: 1,
  borderColor: Colors.surfaceGlassBorder,
  ...Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 24,
    },
    android: { elevation: 8 },
  }),
};
