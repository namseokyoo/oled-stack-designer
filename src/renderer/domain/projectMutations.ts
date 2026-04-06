/**
 * projectMutations.ts — Project/Device clone 및 초기 데이터
 *
 * 모든 함수는 순수 함수. React/Zustand 의존 없음.
 */

import type { ColorToken, Device, Layer, LayerRole, Project } from '../types'
import { cloneLayers } from './layerOps'

const now = (): string => new Date().toISOString()

/**
 * Device deep clone.
 * 출처: useStackStore.ts cloneDevice
 */
export function cloneDevice(device: Device): Device {
  return {
    ...device,
    layers: cloneLayers(device.layers)
  }
}

/**
 * Device 배열 deep clone.
 * 출처: useStackStore.ts cloneDevices
 */
export function cloneDevices(devices: Device[]): Device[] {
  return devices.map((device) => cloneDevice(device))
}

/**
 * Project deep clone (devices/activeDeviceId 제외).
 * 출처: useStackStore.ts cloneProject
 */
export function cloneProject(project: Project): Project {
  const { devices: _devices, activeDeviceId: _activeDeviceId, ...rest } = project

  return {
    ...rest,
    metadata: { ...rest.metadata },
    stacks: rest.stacks.map((stack) => ({
      ...stack,
      layers: cloneLayers(stack.layers)
    }))
  }
}

/**
 * Project metadata.updatedAt 갱신.
 * 출처: useStackStore.ts touch
 */
export function touch(project: Project): Project {
  return {
    ...project,
    metadata: {
      ...project.metadata,
      updatedAt: now()
    }
  }
}

/**
 * LayerRole → ColorToken 매핑.
 * 출처: useStackStore.ts roleToColorToken
 */
export const roleToColorToken: Record<LayerRole, ColorToken> = {
  cathode: 'cathode',
  eil: 'eil',
  etl: 'etl',
  eml: 'eml-b',
  htl: 'htl',
  hil: 'hil',
  anode: 'anode',
  cgl: 'cgl',
  custom: 'custom'
}

/**
 * 초기 레이어 데이터 (single mode).
 * 출처: useStackStore.ts INITIAL_LAYERS
 */
export const INITIAL_LAYERS: Layer[] = [
  {
    id: 'cathode-1',
    name: 'Cathode',
    role: 'cathode',
    material: 'Al',
    thickness: 100,
    colorToken: 'cathode',
    appliesTo: ['r', 'g', 'b']
  },
  {
    id: 'eil-1',
    name: 'EIL',
    role: 'eil',
    material: 'LiF',
    thickness: 1,
    colorToken: 'eil',
    appliesTo: ['r', 'g', 'b']
  },
  {
    id: 'etl-1',
    name: 'ETL',
    role: 'etl',
    material: 'Alq3',
    thickness: 30,
    colorToken: 'etl',
    appliesTo: ['r', 'g', 'b']
  },
  {
    id: 'eml-1',
    name: 'EML',
    role: 'eml',
    material: 'CBP:Ir(ppy)3',
    thickness: 40,
    colorToken: 'eml-g',
    appliesTo: ['r', 'g', 'b']
  },
  {
    id: 'htl-1',
    name: 'HTL',
    role: 'htl',
    material: 'NPB',
    thickness: 50,
    colorToken: 'htl',
    appliesTo: ['r', 'g', 'b']
  },
  {
    id: 'hil-1',
    name: 'HIL',
    role: 'hil',
    material: 'MoO3',
    thickness: 10,
    colorToken: 'hil',
    appliesTo: ['r', 'g', 'b']
  },
  {
    id: 'anode-1',
    name: 'Anode',
    role: 'anode',
    material: 'ITO',
    thickness: 150,
    colorToken: 'anode',
    appliesTo: ['r', 'g', 'b']
  }
]

/**
 * 초기 레이어 데이터 (RGB mode).
 * 출처: useStackStore.ts INITIAL_RGB_LAYERS
 */
export const INITIAL_RGB_LAYERS: Layer[] = [
  {
    id: 'cathode-rgb-1',
    name: 'Cathode',
    role: 'cathode',
    material: 'Al',
    thickness: 100,
    colorToken: 'cathode',
    appliesTo: ['r', 'g', 'b']
  },
  {
    id: 'eil-rgb-1',
    name: 'EIL',
    role: 'eil',
    material: 'LiF',
    thickness: 1,
    colorToken: 'eil',
    appliesTo: ['r', 'g', 'b']
  },
  {
    id: 'etl-rgb-1',
    name: 'ETL',
    role: 'etl',
    material: 'Alq3',
    thickness: 30,
    colorToken: 'etl',
    appliesTo: ['r', 'g', 'b']
  },
  {
    id: 'eml-r-1',
    name: 'EML-R',
    role: 'eml',
    material: 'CBP:Ir(piq)2(acac)',
    thickness: 40,
    colorToken: 'eml-r',
    appliesTo: ['r']
  },
  {
    id: 'eml-g-1',
    name: 'EML-G',
    role: 'eml',
    material: 'CBP:Ir(ppy)3',
    thickness: 35,
    colorToken: 'eml-g',
    appliesTo: ['g']
  },
  {
    id: 'eml-b-1',
    name: 'EML-B',
    role: 'eml',
    material: 'mCBP:FCNIrpic',
    thickness: 25,
    colorToken: 'eml-b',
    appliesTo: ['b']
  },
  {
    id: 'htl-rgb-1',
    name: 'HTL',
    role: 'htl',
    material: 'NPB',
    thickness: 50,
    colorToken: 'htl',
    appliesTo: ['r', 'g', 'b']
  },
  {
    id: 'hil-rgb-1',
    name: 'HIL',
    role: 'hil',
    material: 'MoO3',
    thickness: 10,
    colorToken: 'hil',
    appliesTo: ['r', 'g', 'b']
  },
  {
    id: 'anode-rgb-1',
    name: 'Anode',
    role: 'anode',
    material: 'ITO',
    thickness: 150,
    colorToken: 'anode',
    appliesTo: ['r', 'g', 'b']
  }
]

/**
 * 초기 프로젝트.
 * 출처: useStackStore.ts INITIAL_PROJECT
 * 주의: stacks[0].layers는 호출 시 cloneLayers(INITIAL_LAYERS)로 초기화해야 함
 */
export const INITIAL_PROJECT: Project = {
  schemaVersion: '1.0.0',
  metadata: {
    name: 'Untitled Project',
    version: '1.0.0',
    createdAt: now(),
    updatedAt: now()
  },
  viewMode: 'scientific',
  structureMode: 'single',
  palette: 'classic',
  thicknessMode: 'uniform',
  stacks: [{ id: 'stack-1', label: 'Stack 1', layers: cloneLayers(INITIAL_LAYERS) }]
}
