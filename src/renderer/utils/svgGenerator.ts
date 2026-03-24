import { MIN_REAL_HEIGHT, UNIFORM_HEIGHT } from '../components/LayerBlock'
import type { ChannelCode, Layer, PaletteType, StructureMode, ThicknessMode } from '../types'
import { getTextColorForBg, resolveLayerColorHex } from './colorUtils'

export type ExportBackground = 'white' | 'dark' | 'transparent'

export interface SvgExportOptions {
  layers: Layer[]
  palette: PaletteType
  thicknessMode: ThicknessMode
  background: ExportBackground
  scaleFactor?: number
  structureMode?: StructureMode
}

const LAYER_WIDTH = 480
const LABEL_WIDTH = 180
const MARGIN = 40
const GAP = 6
const TARGET_HEIGHT = 600
const CHANNELS: ChannelCode[] = ['r', 'g', 'b']

function computeScaleFactor(layers: Layer[], canvasHeight: number): number {
  if (layers.length === 0) {
    return 1
  }

  const totalThickness = layers.reduce((sum, layer) => sum + layer.thickness, 0)
  const availableHeight = canvasHeight - layers.length * 22
  const naiveScale = totalThickness > 0 ? availableHeight / totalThickness : 1
  const minThickness = Math.min(...layers.map((layer) => layer.thickness))
  const minScaleForMin = minThickness > 0 ? MIN_REAL_HEIGHT / minThickness : 1

  return Math.max(naiveScale, minScaleForMin)
}

function computeTotalHeight(heights: number[]): number {
  if (heights.length === 0) {
    return 0
  }

  return heights.reduce((sum, height) => sum + height, 0) + (heights.length - 1) * GAP
}

function computeRgbScaleFactor(layers: Layer[], canvasHeight: number): number {
  if (layers.length === 0) {
    return 1
  }

  const lastEmlIndex = getLastEmlIndex(layers)
  const channelSection = lastEmlIndex >= 0 ? layers.slice(0, lastEmlIndex + 1) : []
  const lowerSection = lastEmlIndex >= 0 ? layers.slice(lastEmlIndex + 1) : layers

  const lowerThickness = lowerSection.reduce((sum, layer) => sum + layer.thickness, 0)
  const maxChannelThickness = Math.max(
    0,
    ...CHANNELS.map((channel) =>
      channelSection.reduce((sum, layer) => {
        if (!layer.appliesTo.includes(channel)) {
          return sum
        }

        return sum + resolveChannelThickness(layer, channel)
      }, 0)
    )
  )
  const totalThickness = lowerThickness + maxChannelThickness
  const lowerRectCount = lowerSection.length
  const maxChannelRectCount = Math.max(
    0,
    ...CHANNELS.map(
      (channel) => channelSection.filter((layer) => layer.appliesTo.includes(channel)).length
    )
  )
  const totalRectCount = lowerRectCount + maxChannelRectCount
  const availableHeight = canvasHeight - totalRectCount * 22
  const naiveScale = totalThickness > 0 ? availableHeight / totalThickness : 1

  const allThicknesses = [
    ...lowerSection.map((layer) => layer.thickness),
    ...channelSection.flatMap((layer) =>
      layer.appliesTo.map((channel) => resolveChannelThickness(layer, channel))
    )
  ]
  const minThickness = allThicknesses.length > 0 ? Math.min(...allThicknesses) : 0
  const minScaleForMin = minThickness > 0 ? MIN_REAL_HEIGHT / minThickness : 1

  return Math.max(naiveScale, minScaleForMin)
}

function resolveBlockHeight(
  layer: Layer,
  thicknessMode: ThicknessMode,
  scaleFactor: number
): number {
  return resolveBlockHeightForThickness(layer.thickness, thicknessMode, scaleFactor)
}

function resolveBlockHeightForThickness(
  thickness: number,
  thicknessMode: ThicknessMode,
  scaleFactor: number
): number {
  if (thicknessMode === 'real') {
    return Math.max(MIN_REAL_HEIGHT, thickness * scaleFactor)
  }

  return UNIFORM_HEIGHT
}

function getLastEmlIndex(layers: Layer[]): number {
  for (let i = layers.length - 1; i >= 0; i -= 1) {
    if (layers[i]?.role === 'eml') {
      return i
    }
  }

  return -1
}

function isCommonLayer(layer: Layer): boolean {
  return layer.appliesTo.length === 3
}

function resolveChannelThickness(layer: Layer, channel: ChannelCode): number {
  return layer.channelOverrides?.[channel]?.thickness ?? layer.thickness
}

function resolveChannelColorHex(
  layer: Layer,
  palette: PaletteType,
  channel: ChannelCode
): string {
  return layer.channelOverrides?.[channel]?.customColor ?? resolveLayerColorHex(layer, palette)
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function generateStackSVG(options: SvgExportOptions): string {
  const { layers, palette, thicknessMode, background, structureMode } = options

  if (layers.length === 0) {
    return '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><text x="100" y="50" text-anchor="middle" fill="#888888">No layers</text></svg>'
  }

  if (structureMode === 'rgb') {
    const scaleFactor =
      thicknessMode === 'real'
        ? options.scaleFactor ?? computeRgbScaleFactor(layers, TARGET_HEIGHT)
        : 1
    const lastEmlIndex = getLastEmlIndex(layers)
    const channelSection = lastEmlIndex >= 0 ? layers.slice(0, lastEmlIndex + 1) : []
    const lowerSection = lastEmlIndex >= 0 ? layers.slice(lastEmlIndex + 1) : layers
    const lowerHeights = lowerSection.map((layer) =>
      resolveBlockHeight(layer, thicknessMode, scaleFactor)
    )
    const lowerTotalHeight = computeTotalHeight(lowerHeights)
    const columnWidth = (LAYER_WIDTH - 2 * GAP) / 3
    const columnLayouts = CHANNELS.map((channel) => {
      const channelLayers = channelSection.filter((layer) => layer.appliesTo.includes(channel))
      const heights = channelLayers.map((layer) =>
        resolveBlockHeightForThickness(
          resolveChannelThickness(layer, channel),
          thicknessMode,
          scaleFactor
        )
      )

      return {
        channel,
        x: MARGIN + CHANNELS.indexOf(channel) * (columnWidth + GAP),
        channelLayers,
        heights,
        totalHeight: computeTotalHeight(heights)
      }
    })
    const maxColumnHeight = Math.max(0, ...columnLayouts.map((layout) => layout.totalHeight))
    const sectionGap = channelSection.length > 0 && lowerSection.length > 0 ? GAP : 0
    const svgWidth = MARGIN * 2 + LAYER_WIDTH + LABEL_WIDTH
    const svgHeight = MARGIN + maxColumnHeight + sectionGap + lowerTotalHeight + MARGIN
    const bgColor =
      background === 'white' ? '#ffffff' : background === 'dark' ? '#11131a' : 'none'
    const bgRect =
      background === 'transparent'
        ? ''
        : `  <rect width="${svgWidth}" height="${svgHeight}" fill="${bgColor}"/>\n`
    const layerElements: string[] = []
    let y = MARGIN

    if (channelSection.length > 0) {
      for (const { channel, x, channelLayers, heights, totalHeight } of columnLayouts) {
        let columnY = y + (maxColumnHeight - totalHeight)

        for (let index = 0; index < channelLayers.length; index += 1) {
          const layer = channelLayers[index]
          const height = heights[index]

          if (!layer || typeof height !== 'number') {
            continue
          }

          const colorHex = resolveChannelColorHex(layer, palette, channel)
          const textColor = getTextColorForBg(colorHex)
          const showLabel = !isCommonLayer(layer) || channel === 'g'
          const textY = columnY + height / 2

          layerElements.push(
            `  <rect x="${x}" y="${columnY}" width="${columnWidth}" height="${height}" rx="8" fill="${colorHex}" stroke="#ffffff22" stroke-width="1"/>`
          )

          if (showLabel) {
            if (height >= 32) {
              if (isCommonLayer(layer) && channel === 'g') {
                layerElements.push(
                  `  <text x="${x + 10}" y="${textY - 8}" dominant-baseline="middle" text-anchor="start" fill="${textColor}" font-family="Inter, 'Segoe UI', system-ui, sans-serif" font-size="11" font-weight="700">${escapeXml(layer.name)}</text>`
                )
                layerElements.push(
                  `  <text x="${x + 10}" y="${textY + 4}" dominant-baseline="middle" text-anchor="start" fill="${textColor}" font-family="JetBrains Mono, Consolas, monospace" font-size="10">${resolveChannelThickness(layer, channel)} nm</text>`
                )

                if (layer.material) {
                  layerElements.push(
                    `  <text x="${x + 10}" y="${textY + 16}" dominant-baseline="middle" text-anchor="start" fill="${textColor}" font-family="JetBrains Mono, Consolas, monospace" font-size="9" opacity="0.75">${escapeXml(layer.material)}</text>`
                  )
                }
              } else {
                layerElements.push(
                  `  <text x="${x + 10}" y="${textY - 6}" dominant-baseline="middle" text-anchor="start" fill="${textColor}" font-family="Inter, 'Segoe UI', system-ui, sans-serif" font-size="11" font-weight="700">${escapeXml(layer.name)}</text>`
                )
                layerElements.push(
                  `  <text x="${x + 10}" y="${textY + 8}" dominant-baseline="middle" text-anchor="start" fill="${textColor}" font-family="JetBrains Mono, Consolas, monospace" font-size="10">${resolveChannelThickness(layer, channel)} nm</text>`
                )
              }
            } else {
              layerElements.push(
                `  <text x="${x + 10}" y="${textY}" dominant-baseline="middle" text-anchor="start" fill="${textColor}" font-family="Inter, 'Segoe UI', system-ui, sans-serif" font-size="11" font-weight="700">${escapeXml(layer.name)}</text>`
              )
            }
          }

          columnY += height + GAP
        }
      }

      y += maxColumnHeight + sectionGap
    }

    for (let index = 0; index < lowerSection.length; index += 1) {
      const layer = lowerSection[index]
      const height = lowerHeights[index]

      if (!layer || typeof height !== 'number') {
        continue
      }

      const colorHex = resolveLayerColorHex(layer, palette)
      const textColor = getTextColorForBg(colorHex)
      const textY = y + height / 2

      layerElements.push(
        `  <rect x="${MARGIN}" y="${y}" width="${LAYER_WIDTH}" height="${height}" rx="8" fill="${colorHex}" stroke="#ffffff22" stroke-width="1"/>`
      )
      layerElements.push(
        `  <text x="${MARGIN + 14}" y="${textY}" dominant-baseline="middle" fill="${textColor}" font-family="Inter, 'Segoe UI', system-ui, sans-serif" font-size="13" font-weight="700">${escapeXml(layer.name)}</text>`
      )

      if (height >= 36) {
        layerElements.push(
          `  <text x="${MARGIN + LAYER_WIDTH - 14}" y="${textY - 6}" dominant-baseline="middle" text-anchor="end" fill="${textColor}" font-family="JetBrains Mono, Consolas, monospace" font-size="11">${layer.thickness} nm</text>`
        )

        if (layer.material) {
          layerElements.push(
            `  <text x="${MARGIN + LAYER_WIDTH - 14}" y="${textY + 8}" dominant-baseline="middle" text-anchor="end" fill="${textColor}" font-family="JetBrains Mono, Consolas, monospace" font-size="10" opacity="0.75">${escapeXml(layer.material)}</text>`
          )
        }
      }

      y += height + GAP
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}">
  <defs>
    <style>
      text { font-family: Inter, 'Segoe UI', system-ui, sans-serif; }
    </style>
  </defs>
${bgRect}${layerElements.join('\n')}
</svg>`
  }

  const scaleFactor =
    thicknessMode === 'real'
      ? options.scaleFactor ?? computeScaleFactor(layers, TARGET_HEIGHT)
      : 1
  const layerHeights = layers.map((layer) => resolveBlockHeight(layer, thicknessMode, scaleFactor))
  const totalLayerHeight = computeTotalHeight(layerHeights)
  const svgWidth = MARGIN * 2 + LAYER_WIDTH + LABEL_WIDTH
  const svgHeight = MARGIN * 2 + totalLayerHeight
  const bgColor =
    background === 'white' ? '#ffffff' : background === 'dark' ? '#11131a' : 'none'
  const bgRect =
    background === 'transparent'
      ? ''
      : `  <rect width="${svgWidth}" height="${svgHeight}" fill="${bgColor}"/>\n`

  const layerElements: string[] = []
  let y = MARGIN

  for (let index = 0; index < layers.length; index += 1) {
    const layer = layers[index]
    const height = layerHeights[index]

    if (!layer || typeof height !== 'number') {
      continue
    }

    const colorHex = resolveLayerColorHex(layer, palette)
    const textColor = getTextColorForBg(colorHex)
    const textY = y + height / 2

    layerElements.push(
      `  <rect x="${MARGIN}" y="${y}" width="${LAYER_WIDTH}" height="${height}" rx="8" fill="${colorHex}" stroke="#ffffff22" stroke-width="1"/>`
    )
    layerElements.push(
      `  <text x="${MARGIN + 14}" y="${textY}" dominant-baseline="middle" fill="${textColor}" font-family="Inter, 'Segoe UI', system-ui, sans-serif" font-size="13" font-weight="700">${escapeXml(layer.name)}</text>`
    )

    if (height >= 36) {
      layerElements.push(
        `  <text x="${MARGIN + LAYER_WIDTH - 14}" y="${textY - 6}" dominant-baseline="middle" text-anchor="end" fill="${textColor}" font-family="JetBrains Mono, Consolas, monospace" font-size="11">${layer.thickness} nm</text>`
      )

      if (layer.material) {
        layerElements.push(
          `  <text x="${MARGIN + LAYER_WIDTH - 14}" y="${textY + 8}" dominant-baseline="middle" text-anchor="end" fill="${textColor}" font-family="JetBrains Mono, Consolas, monospace" font-size="10" opacity="0.75">${escapeXml(layer.material)}</text>`
        )
      }
    }

    y += height + GAP
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}">
  <defs>
    <style>
      text { font-family: Inter, 'Segoe UI', system-ui, sans-serif; }
    </style>
  </defs>
${bgRect}${layerElements.join('\n')}
</svg>`
}

function readSvgSize(svgString: string): { width: number; height: number } {
  const widthMatch = svgString.match(/width="(\d+)"/)
  const heightMatch = svgString.match(/height="(\d+)"/)
  return {
    width: widthMatch ? Number.parseInt(widthMatch[1], 10) : 1200,
    height: heightMatch ? Number.parseInt(heightMatch[1], 10) : 800
  }
}

export async function svgToPng(svgString: string, scale = 2): Promise<Blob> {
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  return new Promise((resolve, reject) => {
    const image = new Image()

    image.onload = () => {
      const { width, height } = readSvgSize(svgString)
      const exportScale = Math.max(scale, 2000 / width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.ceil(width * exportScale)
      canvas.height = Math.ceil(height * exportScale)

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(url)
        reject(new Error('Canvas 2D context is not available'))
        return
      }

      ctx.setTransform(exportScale, 0, 0, exportScale, 0, 0)
      ctx.drawImage(image, 0, 0, width, height)
      URL.revokeObjectURL(url)

      canvas.toBlob((pngBlob) => {
        if (pngBlob) {
          resolve(pngBlob)
          return
        }

        reject(new Error('Canvas toBlob failed'))
      }, 'image/png')
    }

    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('SVG load failed'))
    }

    image.src = url
  })
}
