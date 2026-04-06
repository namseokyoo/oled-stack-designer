import { create } from 'zustand'
import type { ChannelCode, Device, Layer, PaletteType, Project, StructureMode, ThicknessMode, ViewMode } from '../types'
import { DEFAULT_NEW_LAYER, cloneChannelOverrides, cloneLayer, cloneLayers, duplicateLayerInArray, generateId, insertLayerAfter, removeLayerById, reorderLayerInArray } from '../domain/layerOps'
import { INITIAL_LAYERS, INITIAL_PROJECT, INITIAL_RGB_LAYERS, cloneDevice, cloneDevices, cloneProject, roleToColorToken, touch } from '../domain/projectMutations'
import { CHANNELS, getChannelSuffix, getSplitColorToken, trimChannelSuffix } from '../domain/channelOps'
import { isCommonLayer } from '../domain/geometryEngine'
import { MAX_HISTORY, createSnapshot, pushToHistory, redoFromHistory, undoFromHistory, type HistoryEntry, type HistorySnapshot } from '../application/historyManager'
import { selectSerializableProject as _selectSerializableProject, stripCompareState as _stripCompareState } from '../application/projectSerializer'

interface StackStore {
  project: Project; selectedLayerId: string | null; devices: Device[]; activeDeviceId: string | null
  thicknessMode: ThicknessMode; currentFilePath: string | null; isDirty: boolean
  history: HistoryEntry[]; historyIndex: number; lastAutosaveTime: Date | null
  selectLayer: (id: string | null) => void; addLayer: (afterId?: string, appliesTo?: ChannelCode[]) => void
  removeLayer: (id: string) => void; updateLayer: (id: string, partial: Partial<Layer>) => void
  reorderLayer: (id: string, newIndex: number) => void; duplicateLayer: (id: string) => void
  lockLayer: (id: string, locked: boolean) => void; addDevice: () => void; removeDevice: (id: string) => void
  updateDeviceLayers: (id: string, layers: Layer[]) => void; setActiveDevice: (id: string) => void
  splitToChannels: (id: string) => void; mergeToCommon: (ids: string[]) => void
  setPalette: (palette: PaletteType) => void; setStructureMode: (mode: StructureMode) => void
  setViewMode: (mode: ViewMode) => void; toggleThicknessMode: () => void
  setCurrentFilePath: (path: string | null) => void; setDirty: (dirty: boolean) => void
  applyProposal: (nextProject: Project) => void
  loadProjectFromData: (project: Project) => void; resetToNew: () => void; undo: () => void
  redo: () => void; pushHistory: (description: string) => void; setLastAutosaveTime: (time: Date | null) => void
}

type SnapshotState = Pick<StackStore, 'project' | 'selectedLayerId' | 'devices' | 'activeDeviceId'>
type HistoryState = SnapshotState & Pick<StackStore, 'history' | 'historyIndex'>
type LayerChange = { layers: Layer[]; description: string; selectedLayerId?: string | null }

function resolveActiveDeviceState(state: Pick<StackStore, 'devices' | 'activeDeviceId'>): { device: Device | null; index: number; activeDeviceId: string | null } {
  if (state.devices.length === 0) return { device: null, index: -1, activeDeviceId: null }
  const currentIndex = state.activeDeviceId ? state.devices.findIndex((device) => device.id === state.activeDeviceId) : -1
  const index = currentIndex >= 0 ? currentIndex : 0
  const device = state.devices[index] ?? null
  return { device, index, activeDeviceId: device?.id ?? null }
}

function syncCurrentSnapshot(history: HistoryEntry[], historyIndex: number, snapshot: HistorySnapshot): Pick<StackStore, 'history' | 'historyIndex'> {
  if (historyIndex < 0 || !history[historyIndex]) return { history, historyIndex }
  const nextHistory = [...history]
  nextHistory[historyIndex] = { ...nextHistory[historyIndex], state: snapshot }
  return { history: nextHistory, historyIndex }
}

function makeCommitTrackedChange(state: HistoryState, nextSnapshot: HistorySnapshot, description: string): Pick<StackStore, 'history' | 'historyIndex'> {
  const currentSnapshot = createSnapshot(state.project, state.selectedLayerId, state.devices, state.activeDeviceId)
  return pushToHistory(state.history, state.historyIndex, currentSnapshot, nextSnapshot, description)
}

export const useStackStore = create<StackStore>((set) => {
  const snapshotOf = (next: SnapshotState) => createSnapshot(next.project, next.selectedLayerId, next.devices, next.activeDeviceId)
  const withTrackedChange = (state: HistoryState, next: SnapshotState, description: string) => ({
    ...next,
    thicknessMode: next.project.thicknessMode,
    isDirty: true,
    ...makeCommitTrackedChange(state, snapshotOf(next), description)
  })
  const withSyncedSnapshot = (state: HistoryState, next: SnapshotState, dirty = false) => ({
    ...next,
    ...(dirty ? { thicknessMode: next.project.thicknessMode, isDirty: true } : {}),
    ...syncCurrentSnapshot(state.history, state.historyIndex, snapshotOf(next))
  })
  const createNewLayer = (appliesTo?: ChannelCode[]): Layer => ({ id: generateId(), ...DEFAULT_NEW_LAYER, appliesTo: appliesTo ? [...appliesTo] : [...DEFAULT_NEW_LAYER.appliesTo] })
  const applyLayerChange = (state: HistoryState, mutate: (layers: Layer[]) => LayerChange | null) => {
    if (state.project.structureMode === 'compare') {
      const { device, index, activeDeviceId } = resolveActiveDeviceState(state)
      if (!device) return state
      const result = mutate(device.layers)
      if (!result) return state
      const devices = state.devices.map((entry, entryIndex) => (entryIndex === index ? { ...entry, layers: result.layers } : entry))
      return withTrackedChange(state, { project: touch({ ...state.project }), selectedLayerId: result.selectedLayerId ?? state.selectedLayerId, devices, activeDeviceId }, result.description)
    }

    const stack = state.project.stacks[0]
    const result = mutate(stack.layers)
    if (!result) return state
    return withTrackedChange(
      state,
      { project: touch({ ...state.project, stacks: [{ ...stack, layers: result.layers }] }), selectedLayerId: result.selectedLayerId ?? state.selectedLayerId, devices: state.devices, activeDeviceId: state.activeDeviceId },
      result.description
    )
  }
  const syncProject = (state: HistoryState, project: Project) =>
    withSyncedSnapshot(state, { project, selectedLayerId: state.selectedLayerId, devices: state.devices, activeDeviceId: state.activeDeviceId }, true)

  return {
    project: cloneProject(INITIAL_PROJECT),
    selectedLayerId: null,
    devices: [],
    activeDeviceId: null,
    thicknessMode: INITIAL_PROJECT.thicknessMode,
    currentFilePath: null,
    isDirty: false,
    history: [],
    historyIndex: -1,
    lastAutosaveTime: null,

    setLastAutosaveTime: (time) => set({ lastAutosaveTime: time }),

    selectLayer: (id) => set((state) => withSyncedSnapshot(state, { project: state.project, selectedLayerId: id, devices: state.devices, activeDeviceId: state.activeDeviceId })),

    addLayer: (afterId, appliesTo) =>
      set((state) => {
        const newLayer = createNewLayer(appliesTo)
        return applyLayerChange(state, (layers) => ({ layers: insertLayerAfter(layers, afterId, newLayer), description: '레이어 추가', selectedLayerId: newLayer.id }))
      }),

    removeLayer: (id) =>
      set((state) =>
        applyLayerChange(state, (layers) => {
          const targetLayer = layers.find((layer) => layer.id === id)
          if (!targetLayer || targetLayer.locked) return null
          return { layers: removeLayerById(layers, id), description: `레이어 삭제: ${targetLayer.name}`, selectedLayerId: state.selectedLayerId === id ? null : state.selectedLayerId }
        })
      ),

    updateLayer: (id, partial) =>
      set((state) =>
        applyLayerChange(state, (layers) => {
          const currentLayer = layers.find((layer) => layer.id === id)
          if (!currentLayer || currentLayer.locked) return null
          return {
            layers: layers.map((layer) => {
              if (layer.id !== id) return layer
              const updatedLayer: Layer = { ...layer, ...partial }
              if (partial.role && !updatedLayer.customColor) updatedLayer.colorToken = roleToColorToken[partial.role]
              return updatedLayer
            }),
            description: `레이어 편집: ${currentLayer.name}`
          }
        })
      ),

    reorderLayer: (id, newIndex) =>
      set((state) =>
        applyLayerChange(state, (layers) => {
          const nextLayers = reorderLayerInArray(layers, id, newIndex)
          return nextLayers === layers ? null : { layers: nextLayers, description: '순서 변경' }
        })
      ),

    duplicateLayer: (id) =>
      set((state) =>
        applyLayerChange(state, (layers) => {
          const layerIndex = layers.findIndex((layer) => layer.id === id)
          const targetLayer = layers[layerIndex]
          if (!targetLayer) return null
          const nextLayers = duplicateLayerInArray(layers, id)
          if (nextLayers === layers) return null
          return { layers: nextLayers, description: `레이어 복제: ${targetLayer.name}`, selectedLayerId: nextLayers[layerIndex + 1]?.id ?? state.selectedLayerId }
        })
      ),

    lockLayer: (id, locked) =>
      set((state) =>
        applyLayerChange(state, (layers) => {
          const targetLayer = layers.find((layer) => layer.id === id)
          if (!targetLayer || targetLayer.locked === locked) return null
          return {
            layers: layers.map((layer) => (layer.id === id ? { ...layer, locked } : layer)),
            description: locked ? `레이어 잠금: ${targetLayer.name}` : `레이어 잠금 해제: ${targetLayer.name}`
          }
        })
      ),

    addDevice: () =>
      set((state) => {
        if (state.devices.length >= 4) return state
        const baseDevice = state.devices[0]
        const existingNames = new Set(state.devices.map((device) => device.name))
        let newDeviceName = `Device ${String.fromCharCode(65 + state.devices.length)}`
        for (let i = 0; i < 4; i += 1) {
          const candidate = `Device ${String.fromCharCode(65 + i)}`
          if (!existingNames.has(candidate)) {
            newDeviceName = candidate
            break
          }
        }
        const newDevice: Device = { id: `device-${Date.now()}`, name: newDeviceName, layers: baseDevice ? cloneDevice(baseDevice).layers : [] }
        const devices = [...state.devices, newDevice]
        const activeDeviceId = state.activeDeviceId ?? devices[0]?.id ?? null
        return withTrackedChange(state, { project: touch({ ...state.project }), selectedLayerId: state.selectedLayerId, devices, activeDeviceId }, `비교 대상 추가: ${newDevice.name}`)
      }),

    removeDevice: (id) =>
      set((state) => {
        if (state.devices.length <= 2) return state
        const removedDevice = state.devices.find((device) => device.id === id)
        if (!removedDevice) return state
        const devices = state.devices.filter((device) => device.id !== id)
        const activeDeviceId = state.activeDeviceId === id ? (devices[0]?.id ?? null) : state.activeDeviceId
        return withTrackedChange(state, { project: touch({ ...state.project }), selectedLayerId: state.selectedLayerId, devices, activeDeviceId }, `비교 대상 제거: ${removedDevice.name}`)
      }),

    updateDeviceLayers: (id, layers) =>
      set((state) => {
        const devices = state.devices.map((device) => (device.id === id ? { ...device, layers: cloneLayers(layers) } : device))
        const activeDevice = devices.find((device) => device.id === state.activeDeviceId)
        const selectedLayerId = activeDevice && state.selectedLayerId
          ? activeDevice.layers.some((layer) => layer.id === state.selectedLayerId) ? state.selectedLayerId : null
          : state.selectedLayerId
        return withTrackedChange(state, { project: touch({ ...state.project }), selectedLayerId, devices, activeDeviceId: state.activeDeviceId }, '비교 레이어 업데이트')
      }),

    setActiveDevice: (id) =>
      set((state) => {
        const activeDevice = state.devices.find((device) => device.id === id)
        if (!activeDevice || state.activeDeviceId === id) return state
        const selectedLayerId = state.selectedLayerId && activeDevice.layers.some((layer) => layer.id === state.selectedLayerId) ? state.selectedLayerId : null
        return withSyncedSnapshot(state, { project: state.project, selectedLayerId, devices: state.devices, activeDeviceId: id })
      }),

    splitToChannels: (id) =>
      set((state) => {
        const stack = state.project.stacks[0]
        const layerIndex = stack.layers.findIndex((layer) => layer.id === id)
        const targetLayer = stack.layers[layerIndex]
        if (!targetLayer || targetLayer.locked || !isCommonLayer(targetLayer)) return state
        const splitLayers = CHANNELS.map((channel) => {
          const channelOverride = cloneChannelOverrides(targetLayer.channelOverrides)?.[channel]
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
        const project = touch({ ...state.project, stacks: [{ ...stack, layers: [...stack.layers.slice(0, layerIndex), ...splitLayers, ...stack.layers.slice(layerIndex + 1)] }] })
        return withTrackedChange(state, { project, selectedLayerId: splitLayers[0]?.id ?? state.selectedLayerId, devices: state.devices, activeDeviceId: state.activeDeviceId }, `개별층 분리: ${targetLayer.name}`)
      }),

    mergeToCommon: (ids) =>
      set((state) => {
        if (ids.length !== CHANNELS.length) return state
        const stack = state.project.stacks[0]
        const selectedLayers = ids.map((id) => stack.layers.find((layer) => layer.id === id)).filter((layer): layer is Layer => Boolean(layer))
        if (selectedLayers.length !== CHANNELS.length || selectedLayers.some((layer) => layer.locked)) return state
        const orderedLayers = CHANNELS.map((channel) => selectedLayers.find((layer) => layer.appliesTo[0] === channel)).filter((layer): layer is Layer => Boolean(layer))
        if (orderedLayers.length !== CHANNELS.length || new Set(orderedLayers.map((layer) => layer.role)).size !== 1) return state
        const [rLayer, gLayer, bLayer] = orderedLayers
        const mergeIndexes = orderedLayers.map((layer) => stack.layers.findIndex((entry) => entry.id === layer.id)).filter((index) => index >= 0)
        if (mergeIndexes.length !== CHANNELS.length) return state
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
                  g: { thickness: gLayer.thickness, material: gLayer.material, customColor: gLayer.customColor },
                  b: { thickness: bLayer.thickness, material: bLayer.material, customColor: bLayer.customColor }
                }
              : undefined
        }
        const idSet = new Set(ids)
        const remainingLayers = stack.layers.filter((layer) => !idSet.has(layer.id))
        remainingLayers.splice(Math.min(...mergeIndexes), 0, mergedLayer)
        return withTrackedChange(state, { project: touch({ ...state.project, stacks: [{ ...stack, layers: remainingLayers }] }), selectedLayerId: mergedLayer.id, devices: state.devices, activeDeviceId: state.activeDeviceId }, `공통층 병합: ${mergedLayer.name}`)
      }),

    setPalette: (palette) => set((state) => syncProject(state, touch({ ...state.project, palette }))),

    setStructureMode: (mode) =>
      set((state) => {
        if (state.project.structureMode === mode) return state
        if (mode === 'compare') {
          const currentLayers = cloneLayers(state.project.stacks[0]?.layers ?? [])
          const deviceA: Device = { id: 'device-a', name: 'Device A', layers: currentLayers }
          const deviceB: Device = { id: 'device-b', name: 'Device B', layers: cloneLayers(currentLayers) }
          return withTrackedChange(state, { project: touch({ ...state.project, structureMode: mode }), selectedLayerId: null, devices: [deviceA, deviceB], activeDeviceId: deviceA.id }, '구조 모드 전환: Compare')
        }
        const stack = state.project.stacks[0]
        const layers = mode === 'rgb' ? cloneLayers(INITIAL_RGB_LAYERS) : cloneLayers(INITIAL_LAYERS)
        return withTrackedChange(state, { project: touch({ ...state.project, structureMode: mode, stacks: [{ ...stack, layers }] }), selectedLayerId: null, devices: [], activeDeviceId: null }, mode === 'rgb' ? '구조 모드 전환: RGB' : '구조 모드 전환: Single')
      }),

    setViewMode: (mode) => set((state) => syncProject(state, touch({ ...state.project, viewMode: mode }))),

    toggleThicknessMode: () =>
      set((state) => {
        const thicknessMode: ThicknessMode = state.thicknessMode === 'uniform' ? 'real' : 'uniform'
        return syncProject(state, touch({ ...state.project, thicknessMode }))
      }),

    setCurrentFilePath: (path) => set({ currentFilePath: path }),
    setDirty: (dirty) => set({ isDirty: dirty }),
    applyProposal: (nextProject) =>
      set((state) =>
        withTrackedChange(
          state,
          { project: nextProject, selectedLayerId: null, devices: state.devices, activeDeviceId: state.activeDeviceId },
          'AI 구조 생성기 적용'
        )
      ),

    loadProjectFromData: (project) =>
      set(() => {
        const nextProject = cloneProject(project)
        const nextDevices = project.structureMode === 'compare' && Array.isArray(project.devices) ? cloneDevices(project.devices) : []
        const requestedActiveDeviceId = project.activeDeviceId ?? null
        const activeDeviceId = nextDevices.find((device) => device.id === requestedActiveDeviceId)?.id ?? nextDevices[0]?.id ?? null
        return { project: nextProject, selectedLayerId: null, devices: nextDevices, activeDeviceId, thicknessMode: nextProject.thicknessMode, currentFilePath: null, isDirty: false, history: [], historyIndex: -1 }
      }),

    resetToNew: () =>
      set(() => {
        const nextProject = cloneProject(INITIAL_PROJECT)
        return { project: nextProject, selectedLayerId: null, devices: [], activeDeviceId: null, thicknessMode: nextProject.thicknessMode, currentFilePath: null, isDirty: false, history: [], historyIndex: -1 }
      }),

    undo: () =>
      set((state) => {
        const result = undoFromHistory(state.history, state.historyIndex)
        if (!result) return state
        const { snapshot, history, historyIndex } = result
        return { project: snapshot.project, selectedLayerId: snapshot.selectedLayerId, devices: snapshot.devices, activeDeviceId: snapshot.activeDeviceId, thicknessMode: snapshot.project.thicknessMode, isDirty: true, history, historyIndex }
      }),

    redo: () =>
      set((state) => {
        const result = redoFromHistory(state.history, state.historyIndex)
        if (!result) return state
        const { snapshot, history, historyIndex } = result
        return { project: snapshot.project, selectedLayerId: snapshot.selectedLayerId, devices: snapshot.devices, activeDeviceId: snapshot.activeDeviceId, thicknessMode: snapshot.project.thicknessMode, isDirty: true, history, historyIndex }
      }),

    pushHistory: (description) =>
      set((state) => {
        const currentSnapshot = createSnapshot(state.project, state.selectedLayerId, state.devices, state.activeDeviceId)
        const nextHistory = [...state.history.slice(0, state.historyIndex + 1), { state: currentSnapshot, description }].slice(-MAX_HISTORY)
        return { history: nextHistory, historyIndex: nextHistory.length - 1 }
      })
  }
})

export type { HistoryEntry }
export { roleToColorToken, _selectSerializableProject as selectSerializableProject, _stripCompareState as stripCompareState }

export function selectTotalThickness(state: { project: Project }): number {
  return state.project.stacks[0]?.layers.reduce((sum, layer) => sum + layer.thickness, 0) ?? 0
}
