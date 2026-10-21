/**
 * The few colours that must be written out rather than read from a CSS token
 * — the browser's theme colour in the page metadata. Each matches its
 * --color-* token in app/globals.css; scripts/check-theme.mjs keeps them so.
 */
export const COLORS = {
  brandInk: '#0f1d57',
} as const
