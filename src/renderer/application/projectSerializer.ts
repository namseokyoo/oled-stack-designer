/**
 * projectSerializer.ts — 프로젝트 직렬화/검증 유틸
 *
 * validateProject: useFileOperations.ts와 CompareCanvas.tsx의 중복 구현을 단일화.
 * selectSerializableProject, stripCompareState: useStackStore.ts 하단 export 함수와 동일 구현.
 *
 * Zustand/React 의존 없음. 모든 함수는 순수 함수.
 */

import type { Device, Project } from '../types'
import { cloneDevices, cloneProject } from '../domain/projectMutations'

/**
 * 얕은 스키마 가드 — schemaVersion(string), metadata(object), stacks(array) 존재 여부만 확인.
 * 출처: useFileOperations.ts L11~29 + CompareCanvas.tsx L51~64 중복 통합.
 */
export function validateProject(data: unknown): data is Project {
  if (typeof data !== 'object' || data === null) {
    return false
  }

  const project = data as Record<string, unknown>

  return (
    typeof project.schemaVersion === 'string' &&
    typeof project.metadata === 'object' &&
    project.metadata !== null &&
    Array.isArray(project.stacks)
  )
}

/**
 * compare 모드 포함 직렬화 가능한 Project 반환.
 * 출처: useStackStore.ts selectSerializableProject (L1444~1460)
 */
export function selectSerializableProject(state: {
  project: Project
  devices: Device[]
  activeDeviceId: string | null
}): Project {
  const project = cloneProject(state.project)

  if (project.structureMode !== 'compare') {
    return project
  }

  return {
    ...project,
    devices: cloneDevices(state.devices),
    activeDeviceId: state.activeDeviceId ?? undefined
  }
}

/**
 * compare 관련 state(devices, activeDeviceId)를 제거한 Project 반환.
 * 출처: useStackStore.ts stripCompareState (L1462~1464)
 */
export function stripCompareState(project: Project): Project {
  return cloneProject(project)
}
