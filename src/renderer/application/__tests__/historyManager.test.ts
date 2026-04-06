import { describe, expect, it } from 'vitest'
import {
  MAX_HISTORY,
  createSnapshot,
  pushToHistory,
  undoFromHistory,
  redoFromHistory
} from '../historyManager'
import type { HistoryEntry, HistorySnapshot } from '../historyManager'
import type { Project } from '../../types'

function makeProject(name: string): Project {
  return {
    schemaVersion: '1.0.0',
    metadata: {
      name,
      version: '1.0.0',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    },
    viewMode: 'scientific',
    structureMode: 'single',
    palette: 'classic',
    thicknessMode: 'uniform',
    stacks: [{ id: 'stack-1', label: 'Stack 1', layers: [] }]
  }
}

function makeSnapshot(name: string): HistorySnapshot {
  return createSnapshot(makeProject(name), null, [], null)
}

describe('historyManager', () => {
  describe('T-07: pushToHistory — MAX_HISTORY 초과 방지', () => {
    it('MAX_HISTORY + 5 번 push 해도 history 길이가 MAX_HISTORY를 초과하지 않음', () => {
      let history: HistoryEntry[] = []
      let historyIndex = -1

      for (let i = 0; i < MAX_HISTORY + 5; i++) {
        const current = makeSnapshot(`state-${i}`)
        const next = makeSnapshot(`state-${i + 1}`)
        const result = pushToHistory(history, historyIndex, current, next, `action-${i}`)
        history = result.history
        historyIndex = result.historyIndex
      }

      expect(history.length).toBeLessThanOrEqual(MAX_HISTORY)
    })
  })

  describe('T-10: undo 후 redo — 원 상태 복원', () => {
    it('push → undo → redo 후 동일 스냅샷 반환', () => {
      const snap0 = makeSnapshot('initial')
      const snap1 = makeSnapshot('after-action')

      const pushed = pushToHistory([], -1, snap0, snap1, 'some action')
      const undone = undoFromHistory(pushed.history, pushed.historyIndex)

      expect(undone).not.toBeNull()

      const redone = redoFromHistory(undone!.history, undone!.historyIndex)

      expect(redone).not.toBeNull()
      expect(redone!.snapshot.project.metadata.name).toBe('after-action')
    })
  })

  describe('빈 히스토리에서 undo', () => {
    it('historyIndex = -1 이면 null 반환', () => {
      expect(undoFromHistory([], -1)).toBeNull()
    })

    it('historyIndex = 0 이면 null 반환 (더 이상 이전 없음)', () => {
      const snap = makeSnapshot('only')
      const history: HistoryEntry[] = [{ state: snap, description: '초기 상태' }]
      expect(undoFromHistory(history, 0)).toBeNull()
    })
  })

  describe('redo 불가 상태에서 redo', () => {
    it('historyIndex가 마지막 인덱스이면 null 반환', () => {
      const snap = makeSnapshot('last')
      const history: HistoryEntry[] = [{ state: snap, description: '마지막' }]
      expect(redoFromHistory(history, 0)).toBeNull()
    })

    it('빈 히스토리에서 redo → null 반환', () => {
      expect(redoFromHistory([], -1)).toBeNull()
    })
  })
})
