import type { ColorToken, Layer, PaletteType } from '../types'

const PALETTE_COLORS: Record<PaletteType, Record<ColorToken, string>> = {
  classic: {
    cathode: 'oklch(42% 0.015 250)',
    eil: 'oklch(82% 0.09 82)',
    etl: 'oklch(72% 0.12 295)',
    'eml-b': 'oklch(62% 0.22 265)',
    'eml-g': 'oklch(68% 0.22 145)',
    'eml-r': 'oklch(60% 0.24 25)',
    cgl: 'oklch(58% 0.03 250)',
    htl: 'oklch(72% 0.14 185)',
    hil: 'oklch(78% 0.1 340)',
    anode: 'oklch(82% 0.06 220)',
    custom: '#6b7280'
  },
  pastel: {
    cathode: 'oklch(72% 0.04 250)',
    eil: 'oklch(90% 0.06 82)',
    etl: 'oklch(85% 0.07 295)',
    'eml-b': 'oklch(78% 0.1 260)',
    'eml-g': 'oklch(82% 0.09 145)',
    'eml-r': 'oklch(78% 0.09 20)',
    cgl: 'oklch(80% 0.03 250)',
    htl: 'oklch(84% 0.08 185)',
    hil: 'oklch(88% 0.06 340)',
    anode: 'oklch(88% 0.05 220)',
    custom: '#9ca3af'
  },
  vivid: {
    cathode: 'oklch(35% 0.05 270)',
    eil: 'oklch(88% 0.18 90)',
    etl: 'oklch(68% 0.28 300)',
    'eml-b': 'oklch(60% 0.3 265)',
    'eml-g': 'oklch(72% 0.3 142)',
    'eml-r': 'oklch(58% 0.32 25)',
    cgl: 'oklch(55% 0.08 250)',
    htl: 'oklch(70% 0.25 190)',
    hil: 'oklch(72% 0.22 345)',
    anode: 'oklch(78% 0.16 220)',
    custom: '#4b5563'
  }
}

let colorCanvas: HTMLCanvasElement | null = null
let colorContext: CanvasRenderingContext2D | null = null

function getContext(): CanvasRenderingContext2D {
  if (!colorContext) {
    colorCanvas = document.createElement('canvas')
    colorCanvas.width = 1
    colorCanvas.height = 1
    colorContext = colorCanvas.getContext('2d')
  }

  if (!colorContext) {
    throw new Error('Canvas 2D context is not available')
  }

  return colorContext
}

export function oklchToHex(oklch: string): string {
  try {
    const ctx = getContext()
    ctx.clearRect(0, 0, 1, 1)
    ctx.fillStyle = oklch
    ctx.fillRect(0, 0, 1, 1)
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  } catch {
    return '#888888'
  }
}

export function resolveLayerColor(layer: Layer, palette: PaletteType): string {
  if (layer.customColor) {
    return layer.customColor
  }

  return PALETTE_COLORS[palette][layer.colorToken] ?? '#888888'
}

export function resolveLayerColorHex(layer: Layer, palette: PaletteType): string {
  if (layer.customColor) {
    return layer.customColor
  }

  const color = PALETTE_COLORS[palette][layer.colorToken]
  if (!color) {
    return '#888888'
  }

  return color.startsWith('#') ? color : oklchToHex(color)
}

export function getTextColorForBg(bgHex: string): string {
  const normalized = bgHex.startsWith('#') ? bgHex : '#888888'
  const r = Number.parseInt(normalized.slice(1, 3), 16)
  const g = Number.parseInt(normalized.slice(3, 5), 16)
  const b = Number.parseInt(normalized.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#111111' : '#f0f0f0'
}
