/**
 * The design tokens as plain values, for the places a className cannot reach:
 * placeholderTextColor, SVG fill and stroke, gradients and the navigation theme.
 *
 * Mirrors every --color-* in global.css's @theme block, name for name
 * (--color-brand-ink → brandInk). `npm run typecheck` runs
 * scripts/check-theme.mjs, which fails if the two drift apart.
 */
export const COLORS = {
  ink: '#111827',
  ink2: '#374151',
  muted: '#5b6475',
  faint: '#8a93a3',
  canvas: '#f3f5f8',
  card: '#ffffff',
  line: '#e3e7ee',
  lineStrong: '#cfd5df',

  brand: '#2547d0',
  brandDeep: '#1a3499',
  brandInk: '#0f1d57',
  brandSoft: '#eef2fe',

  success: '#0a8f5c',
  successSoft: '#e7f6ef',
  warning: '#c9730f',
  warningSoft: '#fdf3e4',
  danger: '#d0342c',
  dangerSoft: '#fdeeed',
  info: '#0e7490',
  infoSoft: '#e6f5f8',
  violet: '#6d3fd1',
  violetSoft: '#f1ecfd',
  white: '#ffffff',

  brandBright: '#3b5ce0',
  brandNight: '#152a7a',
  live: '#22c55e',
  liveBright: '#4ade80',
  liveSoft: '#86efac',
  star: '#fbbf24',
  starDeep: '#f59e0b',
  starSoft: '#fcd34d',
  cautionSoft: '#fcd28d',
  dangerDeep: '#b3261e',

  paper: '#fbfcfe',
  qrInk: '#0b1220',

  mapLand: '#e9edf2',
  mapGround: '#eef1f5',
  mapGrid: '#dde2ea',
  mapPark: '#d7ead9',
  mapWater: '#c7dcf1',
  mapRoadEdge: '#d3d9e3',
  mapHighway: '#fbe7b5',
  mapLabel: '#9aa3b2',
} as const

export type ColorToken = keyof typeof COLORS
