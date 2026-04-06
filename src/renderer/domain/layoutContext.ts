/**
 * LayoutContext — 레이어 블록 렌더링에 필요한 기하 상수 컨텍스트
 *
 * 화면(Screen) 렌더와 SVG 내보내기(Export) 각각 다른 갭/높이 값을 사용하므로
 * 프리셋으로 분리한다.
 *
 * 기존 상수 출처:
 *   - SCREEN_LAYOUT.gapPx       ← canvasShared.ts INSERT_ZONE_HEIGHT (L5) = 4
 *   - SCREEN_LAYOUT.uniformBlockPx ← LayerBlock.tsx UNIFORM_HEIGHT (L22) = 52
 *   - SCREEN_LAYOUT.minBlockPx  ← LayerBlock.tsx MIN_REAL_HEIGHT (L23) = 36
 *   - EXPORT_LAYOUT.gapPx       ← svgGenerator.ts GAP (L19) = 6
 *   - EXPORT_LAYOUT.uniformBlockPx ← LayerBlock.tsx UNIFORM_HEIGHT (L22, svgGenerator이 import) = 52
 *   - EXPORT_LAYOUT.minBlockPx  ← LayerBlock.tsx MIN_REAL_HEIGHT (L23, svgGenerator이 import) = 36
 */

export interface LayoutContext {
  /** 레이어 간 갭 (px) */
  gapPx: number
  /** 균일 모드 블록 높이 (px) */
  uniformBlockPx: number
  /** 실제 두께 모드 최소 블록 높이 (px) */
  minBlockPx: number
  /** 캔버스 가용 높이 (px) — 호출 시 계산 */
  canvasHeight: number
}

/** 화면 렌더용 프리셋 */
export const SCREEN_LAYOUT: Omit<LayoutContext, 'canvasHeight'> = {
  gapPx: 4,           // canvasShared.ts INSERT_ZONE_HEIGHT
  uniformBlockPx: 52,  // LayerBlock.tsx UNIFORM_HEIGHT
  minBlockPx: 36,      // LayerBlock.tsx MIN_REAL_HEIGHT
}

/** SVG 내보내기용 프리셋 */
export const EXPORT_LAYOUT: Omit<LayoutContext, 'canvasHeight'> = {
  gapPx: 6,           // svgGenerator.ts GAP
  uniformBlockPx: 52,  // LayerBlock.tsx UNIFORM_HEIGHT (svgGenerator이 import)
  minBlockPx: 36,      // LayerBlock.tsx MIN_REAL_HEIGHT (svgGenerator이 import)
}
