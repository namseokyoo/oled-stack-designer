import { create } from 'zustand'
import type {
  ColorToken,
  ChannelCode,
  Layer,
  LayerRole,
  PaletteType,
  Project,
  StructureMode,
  ThicknessMode,
  ViewMode
} from '../types'

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

const CHANNELS: ChannelCode[] = ['r', 'g', 'b']

const INITIAL_LAYERS: Layer[] = [
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

const INITIAL_RGB_LAYERS: Layer[] = [
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

const MAX_HISTORY = 20
const now = () => new Date().toISOString()

const INITIAL_PROJECT: Project = {
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

interface HistorySnapshot {
  project: Project
  selectedLayerId: string | null
}

export interface HistoryEntry {
  state: HistorySnapshot
  description: string
}

interface StackStore {
  project: Project
  selectedLayerId: string | null
  thicknessMode: ThicknessMode
  currentFilePath: string | null
  isDirty: boolean
  history: HistoryEntry[]
  historyIndex: number
  selectLayer: (id: string | null) => void
  addLayer: (afterId?: string, appliesTo?: ChannelCode[]) => void
  removeLayer: (id: string) => void
  updateLayer: (id: string, partial: Partial<Layer>) => void
  reorderLayer: (id: string, newIndex: number) => void
  duplicateLayer: (id: string) => void
  lockLayer: (id: string, locked: boolean) => void
  splitToChannels: (id: string) => void
  mergeToCommon: (ids: string[]) => void
  setPalette: (palette: PaletteType) => void
  setStructureMode: (mode: StructureMode) => void
  setViewMode: (mode: ViewMode) => void
  toggleThicknessMode: () => void
  setCurrentFilePath: (path: string | null) => void
  setDirty: (dirty: boolean) => void
  loadProjectFromData: (project: Project) => void
  resetToNew: () => void
  undo: () => void
  redo: () => void
  pushHistory: (description: string) => void
}

function generateId(): string {
  return `layer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function cloneChannelOverrides(
  channelOverrides?: Layer['channelOverrides']
): Layer['channelOverrides'] {
  if (!channelOverrides) {
    return undefined
  }

  return {
    r: channelOverrides.r ? { ...channelOverrides.r } : undefined,
    g: channelOverrides.g ? { ...channelOverrides.g } : undefined,
    b: channelOverrides.b ? { ...channelOverrides.b } : undefined
  }
}

function cloneLayer(layer: Layer): Layer {
  return {
    ...layer,
    appliesTo: [...layer.appliesTo],
    channelOverrides: cloneChannelOverrides(layer.channelOverrides)
  }
}

function cloneLayers(layers: Layer[]): Layer[] {
  return layers.map((layer) => cloneLayer(layer))
}

function cloneProject(project: Project): Project {
  return {
    ...project,
    metadata: { ...project.metadata },
    stacks: project.stacks.map((stack) => ({
      ...stack,
      layers: cloneLayers(stack.layers)
    }))
  }
}

function isCommonLayer(layer: Layer): boolean {
  return (
    layer.appliesTo.length === CHANNELS.length &&
    CHANNELS.every((channel) => layer.appliesTo.includes(channel))
  )
}

function getChannelSuffix(channel: ChannelCode): string {
  return channel.toUpperCase()
}

function getSplitColorToken(layer: Layer, channel: ChannelCode): ColorToken {
  if (layer.role !== 'eml') {
    return layer.colorToken
  }

  const tokenMap: Record<ChannelCode, ColorToken> = {
    r: 'eml-r',
    g: 'eml-g',
    b: 'eml-b'
  }

  return tokenMap[channel]
}

function trimChannelSuffix(name: string): string {
  return name.replace(/\s+\(copy\)$/i, '').replace(/(?:\s*-\s*|\s+)(R|G|B)$/i, '').trim()
}

function touch(project: Project): Project {
  return {
    ...project,
    metadata: {
      ...project.metadata,
      updatedAt: now()
    }
  }
}

function createSnapshot(project: Project, selectedLayerId: string | null): HistorySnapshot {
  return { project, selectedLayerId }
}

function syncCurrentSnapshot(
  history: HistoryEntry[],
  historyIndex: number,
  snapshot: HistorySnapshot
): Pick<StackStore, 'history' | 'historyIndex'> {
  if (historyIndex < 0 || !history[historyIndex]) {
    return { history, historyIndex }
  }

  const nextHistory = [...history]
  nextHistory[historyIndex] = {
    ...nextHistory[historyIndex],
    state: snapshot
  }

  return {
    history: nextHistory,
    historyIndex
  }
}

function commitTrackedChange(
  state: Pick<StackStore, 'project' | 'selectedLayerId' | 'history' | 'historyIndex'>,
  nextSnapshot: HistorySnapshot,
  description: string
): Pick<StackStore, 'history' | 'historyIndex'> {
  const currentSnapshot = createSnapshot(state.project, state.selectedLayerId)
  const timeline =
    state.historyIndex >= 0 ? [...state.history.slice(0, state.historyIndex + 1)] : []

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

const DEFAULT_NEW_LAYER: Omit<Layer, 'id'> = {
  name: 'New Layer',
  role: 'custom',
  material: '',
  thickness: 50,
  colorToken: 'custom',
  appliesTo: ['r', 'g', 'b']
}

export const useStackStore = create<StackStore>((set) => ({
  project: cloneProject(INITIAL_PROJECT),
  selectedLayerId: null,
  thicknessMode: INITIAL_PROJECT.thicknessMode,
  currentFilePath: null,
  isDirty: false,
  history: [],
  historyIndex: -1,

  selectLayer: (id) =>
    set((state) => {
      const selectedLayerId = id
      const syncedHistory = syncCurrentSnapshot(
        state.history,
        state.historyIndex,
        createSnapshot(state.project, selectedLayerId)
      )

      return {
        selectedLayerId,
        ...syncedHistory
      }
    }),

  addLayer: (afterId, appliesTo) =>
    set((state) => {
      const stack = state.project.stacks[0]
      const newLayer: Layer = {
        id: generateId(),
        ...DEFAULT_NEW_LAYER,
        appliesTo: appliesTo ? [...appliesTo] : [...DEFAULT_NEW_LAYER.appliesTo]
      }
      const description = '레이어 추가'
      let newLayers: Layer[]

      if (afterId) {
        const index = stack.layers.findIndex((layer) => layer.id === afterId)
        newLayers =
          index >= 0
            ? [
                ...stack.layers.slice(0, index + 1),
                newLayer,
                ...stack.layers.slice(index + 1)
              ]
            : [...stack.layers, newLayer]
      } else {
        newLayers = [...stack.layers, newLayer]
      }

      const project = touch({
        ...state.project,
        stacks: [{ ...stack, layers: newLayers }]
      })
      const selectedLayerId = newLayer.id

      return {
        project,
        selectedLayerId,
        thicknessMode: project.thicknessMode,
        isDirty: true,
        ...commitTrackedChange(
          state,
          createSnapshot(project, selectedLayerId),
          description
        )
      }
    }),

  removeLayer: (id) =>
    set((state) => {
      const stack = state.project.stacks[0]
      const targetLayer = stack.layers.find((layer) => layer.id === id)

      if (!targetLayer || targetLayer.locked) {
        return state
      }

      const newLayers = stack.layers.filter((layer) => layer.id !== id)
      const project = touch({
        ...state.project,
        stacks: [{ ...stack, layers: newLayers }]
      })
      const selectedLayerId = state.selectedLayerId === id ? null : state.selectedLayerId

      return {
        project,
        selectedLayerId,
        thicknessMode: project.thicknessMode,
        isDirty: true,
        ...commitTrackedChange(
          state,
          createSnapshot(project, selectedLayerId),
          `레이어 삭제: ${targetLayer.name}`
        )
      }
    }),

  updateLayer: (id, partial) =>
    set((state) => {
      const stack = state.project.stacks[0]
      const currentLayer = stack.layers.find((layer) => layer.id === id)

      if (!currentLayer || currentLayer.locked) {
        return state
      }

      const newLayers = stack.layers.map((layer) => {
        if (layer.id !== id) {
          return layer
        }

        const updatedLayer: Layer = { ...layer, ...partial }

        if (partial.role && !updatedLayer.customColor) {
          updatedLayer.colorToken = roleToColorToken[partial.role]
        }

        return updatedLayer
      })

      const project = touch({
        ...state.project,
        stacks: [{ ...stack, layers: newLayers }]
      })

      return {
        project,
        thicknessMode: project.thicknessMode,
        isDirty: true,
        ...commitTrackedChange(
          state,
          createSnapshot(project, state.selectedLayerId),
          `레이어 편집: ${currentLayer.name}`
        )
      }
    }),

  reorderLayer: (id, newIndex) =>
    set((state) => {
      const stack = state.project.stacks[0]
      const currentIndex = stack.layers.findIndex((layer) => layer.id === id)

      if (currentIndex < 0 || currentIndex === newIndex) {
        return state
      }

      const boundedIndex = Math.max(0, Math.min(stack.layers.length - 1, newIndex))
      const newLayers = [...stack.layers]
      const [movedLayer] = newLayers.splice(currentIndex, 1)

      if (movedLayer.locked) {
        return state
      }

      newLayers.splice(boundedIndex, 0, movedLayer)

      const project = touch({
        ...state.project,
        stacks: [{ ...stack, layers: newLayers }]
      })

      return {
        project,
        thicknessMode: project.thicknessMode,
        isDirty: true,
        ...commitTrackedChange(state, createSnapshot(project, state.selectedLayerId), '순서 변경')
      }
    }),

  duplicateLayer: (id) =>
    set((state) => {
      const stack = state.project.stacks[0]
      const layerIndex = stack.layers.findIndex((layer) => layer.id === id)
      const targetLayer = stack.layers[layerIndex]

      if (!targetLayer) {
        return state
      }

      const duplicatedLayer: Layer = {
        ...cloneLayer(targetLayer),
        id: generateId(),
        name: `${targetLayer.name} (copy)`
      }

      const newLayers = [...stack.layers]
      newLayers.splice(layerIndex + 1, 0, duplicatedLayer)

      const project = touch({
        ...state.project,
        stacks: [{ ...stack, layers: newLayers }]
      })
      const selectedLayerId = duplicatedLayer.id

      return {
        project,
        selectedLayerId,
        thicknessMode: project.thicknessMode,
        isDirty: true,
        ...commitTrackedChange(
          state,
          createSnapshot(project, selectedLayerId),
          `레이어 복제: ${targetLayer.name}`
        )
      }
    }),

  lockLayer: (id, locked) =>
    set((state) => {
      const stack = state.project.stacks[0]
      const targetLayer = stack.layers.find((layer) => layer.id === id)

      if (!targetLayer || targetLayer.locked === locked) {
        return state
      }

      const project = touch({
        ...state.project,
        stacks: [
          {
            ...stack,
            layers: stack.layers.map((layer) =>
              layer.id === id ? { ...layer, locked } : layer
            )
          }
        ]
      })

      return {
        project,
        thicknessMode: project.thicknessMode,
        isDirty: true,
        ...commitTrackedChange(
          state,
          createSnapshot(project, state.selectedLayerId),
          locked ? `레이어 잠금: ${targetLayer.name}` : `레이어 잠금 해제: ${targetLayer.name}`
        )
      }
    }),

  splitToChannels: (id) =>
    set((state) => {
      const stack = state.project.stacks[0]
      const layerIndex = stack.layers.findIndex((layer) => layer.id === id)
      const targetLayer = stack.layers[layerIndex]

      if (!targetLayer || targetLayer.locked || !isCommonLayer(targetLayer)) {
        return state
      }

      const splitLayers = CHANNELS.map((channel) => {
        const channelOverride = targetLayer.channelOverrides?.[channel]

        return {
          ...cloneLayer(targetLayer),
          id: generateId(),
          name: `${trimChannelSuffix(targetLayer.name)}-${getChannelSuffix(channel)}`,
          thickness: channelOverride?.thickness ?? targetLayer.thickness,
          material: channelOverride?.material ?? targetLayer.material,
          customColor: channelOverride?.customColor ?? targetLayer.customColor,
          colorToken: getSplitColorToken(targetLayer, channel),
          appliesTo: [channel],
          channelOverrides: undefined
        } satisfies Layer
      })

      const newLayers = [
        ...stack.layers.slice(0, layerIndex),
        ...splitLayers,
        ...stack.layers.slice(layerIndex + 1)
      ]
      const project = touch({
        ...state.project,
        stacks: [{ ...stack, layers: newLayers }]
      })
      const selectedLayerId = splitLayers[0]?.id ?? state.selectedLayerId

      return {
        project,
        selectedLayerId,
        thicknessMode: project.thicknessMode,
        isDirty: true,
        ...commitTrackedChange(
          state,
          createSnapshot(project, selectedLayerId),
          `개별층 분리: ${targetLayer.name}`
        )
      }
    }),

  mergeToCommon: (ids) =>
    set((state) => {
      if (ids.length !== CHANNELS.length) {
        return state
      }

      const stack = state.project.stacks[0]
      const selectedLayers = ids
        .map((id) => stack.layers.find((layer) => layer.id === id))
        .filter((layer): layer is Layer => Boolean(layer))

      if (
        selectedLayers.length !== CHANNELS.length ||
        selectedLayers.some((layer) => layer.locked)
      ) {
        return state
      }

      const orderedLayers = CHANNELS.map((channel) =>
        selectedLayers.find((layer) => layer.appliesTo[0] === channel)
      ).filter((layer): layer is Layer => Boolean(layer))

      if (
        orderedLayers.length !== CHANNELS.length ||
        new Set(orderedLayers.map((layer) => layer.role)).size !== 1
      ) {
        return state
      }

      const [rLayer, gLayer, bLayer] = orderedLayers
      const mergeIndexes = orderedLayers
        .map((layer) => stack.layers.findIndex((entry) => entry.id === layer.id))
        .filter((index) => index >= 0)

      if (mergeIndexes.length !== CHANNELS.length) {
        return state
      }

      const mergedLayer: Layer = {
        ...cloneLayer(rLayer),
        id: generateId(),
        name: trimChannelSuffix(rLayer.name),
        appliesTo: [...CHANNELS],
        channelOverrides:
          gLayer.thickness !== rLayer.thickness ||
          gLayer.material !== rLayer.material ||
          gLayer.customColor !== rLayer.customColor ||
          bLayer.thickness !== rLayer.thickness ||
          bLayer.material !== rLayer.material ||
          bLayer.customColor !== rLayer.customColor
            ? {
                g: {
                  thickness: gLayer.thickness,
                  material: gLayer.material,
                  customColor: gLayer.customColor
                },
                b: {
                  thickness: bLayer.thickness,
                  material: bLayer.material,
                  customColor: bLayer.customColor
                }
              }
            : undefined
      }

      const insertIndex = Math.min(...mergeIndexes)
      const idSet = new Set(ids)
      const remainingLayers = stack.layers.filter((layer) => !idSet.has(layer.id))
      remainingLayers.splice(insertIndex, 0, mergedLayer)

      const project = touch({
        ...state.project,
        stacks: [{ ...stack, layers: remainingLayers }]
      })
      const selectedLayerId = mergedLayer.id

      return {
        project,
        selectedLayerId,
        thicknessMode: project.thicknessMode,
        isDirty: true,
        ...commitTrackedChange(
          state,
          createSnapshot(project, selectedLayerId),
          `공통층 병합: ${mergedLayer.name}`
        )
      }
    }),

  setPalette: (palette) =>
    set((state) => {
      const project = touch({
        ...state.project,
        palette
      })

      return {
        project,
        thicknessMode: project.thicknessMode,
        isDirty: true,
        ...syncCurrentSnapshot(
          state.history,
          state.historyIndex,
          createSnapshot(project, state.selectedLayerId)
        )
      }
    }),

  setStructureMode: (mode) =>
    set((state) => {
      if (state.project.structureMode === mode) {
        return state
      }

      const stack = state.project.stacks[0]
      const project = touch({
        ...state.project,
        structureMode: mode,
        stacks: [
          {
            ...stack,
            layers: mode === 'rgb' ? cloneLayers(INITIAL_RGB_LAYERS) : cloneLayers(INITIAL_LAYERS)
          }
        ]
      })
      const selectedLayerId = null

      return {
        project,
        selectedLayerId,
        thicknessMode: project.thicknessMode,
        isDirty: true,
        ...commitTrackedChange(
          state,
          createSnapshot(project, selectedLayerId),
          mode === 'rgb' ? '구조 모드 전환: RGB' : '구조 모드 전환: Single'
        )
      }
    }),

  setViewMode: (mode) =>
    set((state) => {
      const project = touch({
        ...state.project,
        viewMode: mode
      })

      return {
        project,
        thicknessMode: project.thicknessMode,
        isDirty: true,
        ...syncCurrentSnapshot(
          state.history,
          state.historyIndex,
          createSnapshot(project, state.selectedLayerId)
        )
      }
    }),

  toggleThicknessMode: () =>
    set((state) => {
      const thicknessMode: ThicknessMode = state.thicknessMode === 'uniform' ? 'real' : 'uniform'
      const project = touch({
        ...state.project,
        thicknessMode
      })

      return {
        project,
        thicknessMode,
        isDirty: true,
        ...syncCurrentSnapshot(
          state.history,
          state.historyIndex,
          createSnapshot(project, state.selectedLayerId)
        )
      }
    }),

  setCurrentFilePath: (path) =>
    set(() => ({
      currentFilePath: path
    })),

  setDirty: (dirty) =>
    set(() => ({
      isDirty: dirty
    })),

  loadProjectFromData: (project) =>
    set(() => {
      const nextProject = cloneProject(project)

      return {
        project: nextProject,
        selectedLayerId: null,
        thicknessMode: nextProject.thicknessMode,
        currentFilePath: null,
        isDirty: false,
        history: [],
        historyIndex: -1
      }
    }),

  resetToNew: () =>
    set(() => {
      const nextProject = cloneProject(INITIAL_PROJECT)

      return {
        project: nextProject,
        selectedLayerId: null,
        thicknessMode: nextProject.thicknessMode,
        currentFilePath: null,
        isDirty: false,
        history: [],
        historyIndex: -1
      }
    }),

  undo: () =>
    set((state) => {
      if (state.historyIndex <= 0) {
        return state
      }

      const historyIndex = state.historyIndex - 1
      const snapshot = state.history[historyIndex]?.state

      if (!snapshot) {
        return state
      }

      return {
        project: snapshot.project,
        selectedLayerId: snapshot.selectedLayerId,
        thicknessMode: snapshot.project.thicknessMode,
        isDirty: true,
        historyIndex
      }
    }),

  redo: () =>
    set((state) => {
      if (state.historyIndex >= state.history.length - 1) {
        return state
      }

      const historyIndex = state.historyIndex + 1
      const snapshot = state.history[historyIndex]?.state

      if (!snapshot) {
        return state
      }

      return {
        project: snapshot.project,
        selectedLayerId: snapshot.selectedLayerId,
        thicknessMode: snapshot.project.thicknessMode,
        isDirty: true,
        historyIndex
      }
    }),

  pushHistory: (description) =>
    set((state) => {
      const currentSnapshot = createSnapshot(state.project, state.selectedLayerId)
      const nextHistory = [
        ...state.history.slice(0, state.historyIndex + 1),
        { state: currentSnapshot, description }
      ].slice(-MAX_HISTORY)

      return {
        history: nextHistory,
        historyIndex: nextHistory.length - 1
      }
    })
}))

export function selectTotalThickness(state: { project: Project }): number {
  return state.project.stacks[0]?.layers.reduce((sum, layer) => sum + layer.thickness, 0) ?? 0
}
