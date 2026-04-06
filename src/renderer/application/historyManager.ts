/**
 * historyManager.ts — History 관리 순수 함수
 *
 * Zustand/React 의존 없음. 모든 함수는 순수 함수.
 * 출처: useStackStore.ts의 createSnapshot, commitTrackedChange, undo, redo 로직
 */

import type { Device, Project } from '../types'

export interface HistorySnapshot {
  project: Project
  selectedLayerId: string | null
  devices: Device[]
  activeDeviceId: string | null
}

export interface HistoryEntry {
  state: HistorySnapshot
  description: string
}

export const MAX_HISTORY = 20

/**
 * 현재 상태에서 스냅샷 생성 (순수).
 * 출처: useStackStore.ts createSnapshot (L360~367)
 */
export function createSnapshot(
  project: Project,
  selectedLayerId: string | null,
  devices: Device[],
  activeDeviceId: string | null
): HistorySnapshot {
  return { project, selectedLayerId, devices, activeDeviceId }
}

/**
 * commitTrackedChange의 핵심 로직 추출 (순수, Zustand 비의존).
 * 출처: useStackStore.ts commitTrackedChange (L390~426)
 *
 * @param history 현재 히스토리 배열
 * @param historyIndex 현재 히스토리 인덱스
 * @param currentSnapshot 변경 전 현재 상태 스냅샷 (호출자가 미리 생성)
 * @param nextSnapshot 변경 후 새 상태 스냅샷
 * @param description 액션 설명
 * @returns 갱신된 { history, historyIndex }
 */
export function pushToHistory(
  history: HistoryEntry[],
  historyIndex: number,
  currentSnapshot: HistorySnapshot,
  nextSnapshot: HistorySnapshot,
  description: string
): { history: HistoryEntry[]; historyIndex: number } {
  const timeline =
    historyIndex >= 0 ? [...history.slice(0, historyIndex + 1)] : []

  if (timeline.length === 0) {
    timeline.push({
      state: currentSnapshot,
      description: '초기 상태'
    })
  } else {
    timeline[timeline.length - 1] = {
      ...timeline[timeline.length - 1],
      state: currentSnapshot
    }
  }

  const nextHistory = [...timeline, { state: nextSnapshot, description }]
  const trimmedHistory = nextHistory.slice(-MAX_HISTORY)

  return {
    history: trimmedHistory,
    historyIndex: trimmedHistory.length - 1
  }
}

/**
 * undo 로직 추출 (순수).
 * 출처: useStackStore.ts undo (L1376~1398)
 *
 * @returns { snapshot, history, historyIndex } 또는 null (undo 불가 시)
 */
export function undoFromHistory(
  history: HistoryEntry[],
  historyIndex: number
): { snapshot: HistorySnapshot; history: HistoryEntry[]; historyIndex: number } | null {
  if (historyIndex <= 0) {
    return null
  }

  const newIndex = historyIndex - 1
  const snapshot = history[newIndex]?.state

  if (!snapshot) {
    return null
  }

  return {
    snapshot,
    history,
    historyIndex: newIndex
  }
}

/**
 * redo 로직 추출 (순수).
 * 출처: useStackStore.ts redo (L1400~1422)
 *
 * @returns { snapshot, history, historyIndex } 또는 null (redo 불가 시)
 */
export function redoFromHistory(
  history: HistoryEntry[],
  historyIndex: number
): { snapshot: HistorySnapshot; history: HistoryEntry[]; historyIndex: number } | null {
  if (historyIndex >= history.length - 1) {
    return null
  }

  const newIndex = historyIndex + 1
  const snapshot = history[newIndex]?.state

  if (!snapshot) {
    return null
  }

  return {
    snapshot,
    history,
    historyIndex: newIndex
  }
}
