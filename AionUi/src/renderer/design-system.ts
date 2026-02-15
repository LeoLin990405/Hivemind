/**
 * @license
 * Copyright 2026 HiveMind (hivemind.com)
 * SPDX-License-Identifier: Apache-2.0
 */

export const DesignTokens = {
  colors: {
    primary: {
      50: '#0a1628',
      100: '#0d1f35',
      200: '#112842',
      300: '#163a5c',
      400: '#1a6b8a',
      500: '#00d4ff',
      600: '#00b8e0',
      700: '#0099bb',
      800: '#007a99',
      900: '#005c73',
    },
    success: '#00ff88',
    warning: '#ffaa00',
    error: '#ff3366',
    info: '#00d4ff',
    gray: {
      50: '#060b14',
      100: '#0a1120',
      200: '#0e172a',
      300: '#141e33',
      400: '#2a3a55',
      500: '#3d506e',
      600: '#5a7094',
      700: '#7a92b5',
      800: '#a4b8d4',
      900: '#e0f0ff',
    },
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
    '3xl': '64px',
  },
  radius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '22px',
    full: '9999px',
  },
  shadows: {
    sm: '0 2px 8px 0 rgb(0 10 20 / 0.3), 0 0 1px 0 rgba(0, 212, 255, 0.1)',
    md: '0 10px 26px -10px rgb(0 8 18 / 0.5), 0 0 1px 0 rgba(0, 212, 255, 0.15)',
    lg: '0 20px 40px -18px rgb(0 5 12 / 0.6), 0 0 2px 0 rgba(0, 212, 255, 0.12)',
    xl: '0 30px 55px -25px rgb(0 3 8 / 0.7), 0 0 3px 0 rgba(0, 212, 255, 0.1)',
  },
  typography: {
    fontSize: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '18px',
      xl: '20px',
      '2xl': '24px',
      '3xl': '30px',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
  transitions: {
    fast: '140ms cubic-bezier(0.4, 0, 0.2, 1)',
    base: '220ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '380ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

export type DesignTokens = typeof DesignTokens;
