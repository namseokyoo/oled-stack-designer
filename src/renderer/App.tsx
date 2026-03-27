import { useEffect, useState } from 'react'
import { AboutDialog } from './components/AboutDialog'
import { Canvas } from './components/Canvas'
import { CompareCanvas } from './components/CompareCanvas'
import { ExamplesDialog } from './components/ExamplesDialog'
import { ExportDialog } from './components/ExportDialog'
import { HelpDialog } from './components/HelpDialog'
import { PropertiesPanel } from './components/PropertiesPanel'
import { RecoveryDialog } from './components/RecoveryDialog'
import { StatusBar } from './components/StatusBar'
import { Toolbar } from './components/Toolbar'
import { useAutoBackup } from './hooks/useAutoBackup'
import { useBeforeClose } from './hooks/useBeforeClose'
import { useFileOperations } from './hooks/useFileOperations'
import { useStackStore } from './stores/useStackStore'
import type { PaletteType, Project, StructureMode } from './types'

export function App() {
  const palette = useStackStore((state) => state.project.palette)
  const structureMode = useStackStore((state) => state.project.structureMode)
  const currentFilePath = useStackStore((state) => state.currentFilePath)
  const isDirty = useStackStore((state) => state.isDirty)
  const [showExport, setShowExport] = useState(false)
  const [showExamples, setShowExamples] = useState(false)
  const [showRecovery, setShowRecovery] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [backupMtimeMs, setBackupMtimeMs] = useState(0)
  const [autosaveFilePath, setAutosaveFilePath] = useState<string | null>(null)

  const { saveProject, saveProjectAs, loadProject, newProject } = useFileOperations()
  useAutoBackup()
  useBeforeClose()

  useEffect(() => {
    let mounted = true

    const checkForRecovery = async () => {
      // 1. temp backup 체크 (비정상 종료)
      const { exists, mtimeMs } = await window.oledApi.checkBackup()
      if (!mounted) return

      if (exists) {
        setBackupMtimeMs(mtimeMs)
        setShowRecovery(true)
        return
      }

      // 2. autosave 파일 체크
      const autosaves = await window.oledApi.autosaveList()
      if (!mounted) return

      const latest = autosaves[0]
      if (latest) {
        setBackupMtimeMs(latest.timestamp)
        setAutosaveFilePath(latest.filePath)
        setShowRecovery(true)
      }
    }

    void checkForRecovery().catch(() => undefined)

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    const unsubscribe = window.oledApi.onMenuCommand(async (command, payload) => {
      switch (command) {
        case 'menu:new-project':
          await newProject()
          break
        case 'menu:open':
          await loadProject()
          break
        case 'menu:save':
          await saveProject()
          break
        case 'menu:save-as':
          await saveProjectAs()
          break
        case 'menu:export':
          setShowExport(true)
          break
        case 'menu:undo':
          useStackStore.getState().undo()
          break
        case 'menu:redo':
          useStackStore.getState().redo()
          break
        case 'menu:duplicate': {
          const { selectedLayerId, duplicateLayer } = useStackStore.getState()
          if (selectedLayerId) {
            duplicateLayer(selectedLayerId)
          }
          break
        }
        case 'menu:delete': {
          const state = useStackStore.getState()
          if (state.selectedLayerId) {
            state.removeLayer(state.selectedLayerId)
          }
          break
        }
        case 'menu:set-structure-mode':
          if (payload) {
            useStackStore.getState().setStructureMode(payload as StructureMode)
          }
          break
        case 'menu:set-palette':
          if (payload) {
            useStackStore.getState().setPalette(payload as PaletteType)
          }
          break
        case 'menu:toggle-thickness':
          useStackStore.getState().toggleThicknessMode()
          break
        case 'menu:help':
          setShowHelp(true)
          break
        case 'menu:about':
          setShowAbout(true)
          break
      }
    })

    return unsubscribe
  }, [loadProject, newProject, saveProject, saveProjectAs])

  useEffect(() => {
    const fileName = currentFilePath?.split(/[/\\]/).pop() ?? 'Untitled'
    const title = `${isDirty ? '*' : ''}${fileName} - OLED Stack Designer`
    window.oledApi.setWindowTitle(title).catch(() => undefined)
  }, [currentFilePath, isDirty])

  const handleRecover = async () => {
    try {
      let fileContent: string | null = null

      if (autosaveFilePath) {
        // autosave 파일 복구
        fileContent = await window.oledApi.autosaveLoad(autosaveFilePath)
        if (fileContent) {
          await window.oledApi.autosaveDelete(autosaveFilePath)
          setAutosaveFilePath(null)
        }
      } else {
        // temp backup 복구
        fileContent = await window.oledApi.loadBackup()
        if (fileContent) {
          await window.oledApi.deleteBackup()
        }
      }

      if (!fileContent) {
        return
      }

      const parsed = JSON.parse(fileContent) as Project
      useStackStore.getState().loadProjectFromData(parsed)
      setShowRecovery(false)
    } catch {
      return
    }
  }

  const handleDismiss = async () => {
    if (autosaveFilePath) {
      await window.oledApi.autosaveDelete(autosaveFilePath)
      setAutosaveFilePath(null)
    } else {
      await window.oledApi.deleteBackup()
    }
    setShowRecovery(false)
  }

  return (
    <div
      data-palette={palette}
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      <Toolbar onExport={() => setShowExport(true)} />
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {structureMode === 'compare' ? (
          <CompareCanvas onOpenExamples={() => setShowExamples(true)} />
        ) : (
          <Canvas onOpenExamples={() => setShowExamples(true)} />
        )}
        <PropertiesPanel />
      </div>
      <StatusBar />
      {showExport ? <ExportDialog onClose={() => setShowExport(false)} /> : null}
      {showAbout ? <AboutDialog onClose={() => setShowAbout(false)} /> : null}
      {showHelp ? <HelpDialog onClose={() => setShowHelp(false)} /> : null}
      {showExamples ? (
        <ExamplesDialog
          onSelect={(filePath) => {
            void loadProject(filePath)
          }}
          onClose={() => setShowExamples(false)}
        />
      ) : null}
      {showRecovery ? (
        <RecoveryDialog
          minutesAgo={Math.round((Date.now() - backupMtimeMs) / 60000)}
          onRecover={() => {
            void handleRecover()
          }}
          onDismiss={() => {
            void handleDismiss()
          }}
        />
      ) : null}
    </div>
  )
}
