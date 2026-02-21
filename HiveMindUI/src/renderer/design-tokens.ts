/**
 * HiveMind Design Tokens — TypeScript Export
 *
 * Mirrors the CSS custom properties in design-tokens.css.
 * Use these when you need design values in JS/TS (e.g. chart colors, canvas drawing).
 * For React component styling, prefer CSS variables directly.
 */

export const tokens = {
  colors: {
    accent: { light: '#5e6ad2', dark: '#7c83db' },
    accentHover: { light: '#4f5bc4', dark: '#8b91e0' },
    background: { light: '#ffffff', dark: '#191919' },
    bgSecondary: { light: '#f7f7f5', dark: '#1e1e1e' },
    textPrimary: { light: '#1a1a1a', dark: '#ebebeb' },
    textSecondary: { light: '#6b6b6b', dark: '#8e8e8e' },
    border: { light: '#e5e5e5', dark: '#333333' },
    success: '#4caf50',
    warning: '#f59e0b',
    danger: '#e5484d',
    info: { light: '#3b82f6', dark: '#60a5fa' },
  },
  typography: {
    fontSans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontMono: "'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace",
    fontSize: {
      xs: '12px',
      sm: '13px',
      base: '14px',
      lg: '16px',
      xl: '18px',
      '2xl': '22px',
      '3xl': '28px',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
  },
  radius: {
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },
  shadows: {
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.07), 0 4px 6px -4px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
  },
  transitions: {
    fast: '120ms ease',
    base: '200ms ease',
    slow: '350ms ease',
  },
} as const;

/**
 * Diff/change colors (used in FileChangesPanel, Markdown diff highlighting)
 */
export const diffColors = {
  addition: '#4caf50',
  deletion: '#e5484d',
  additionBgDark: 'rgba(76, 175, 80, 0.12)',
  additionBgLight: 'rgba(76, 175, 80, 0.08)',
  deletionBgDark: 'rgba(229, 72, 77, 0.12)',
  deletionBgLight: 'rgba(229, 72, 77, 0.08)',
  hunkBgDark: 'rgba(94, 106, 210, 0.12)',
  hunkBgLight: 'rgba(94, 106, 210, 0.08)',
} as const;

/**
 * Icon colors as CSS variable strings for use in fill/stroke props
 */
export const iconColors = {
  primary: 'var(--text-primary)',
  secondary: 'var(--text-secondary)',
  disabled: 'var(--text-disabled)',
  brand: 'var(--brand)',
  danger: 'var(--danger)',
  warning: 'var(--warning)',
  success: 'var(--success)',
} as const;

export type Tokens = typeof tokens;
