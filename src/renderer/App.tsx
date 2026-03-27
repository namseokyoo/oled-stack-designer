import { useEffect, useState } from 'react'
import { Canvas } from './components/Canvas'
import { CompareCanvas } from './components/CompareCanvas'
import { ExamplesDialog } from './components/ExamplesDialog'
import { ExportDialog } from './components/ExportDialog'
import { PropertiesPanel } from './components/PropertiesPanel'
import { RecoveryDialog } from './components/RecoveryDialog'
import { StatusBar } from './components/StatusBar'
import { Toolbar } from './components/Toolbar'
import { useAutoBackup } from './hooks/useAutoBackup'
import { useBeforeClose } from './hooks/useBeforeClose'
import { useFileOperations } from './hooks/useFileOperations'
import { useStackStore } from './stores/useStackStore'
import type { Project } from './types'

export function App() {
  const palette = useStackStore((state) => state.project.palette)
  const structureMode = useStackStore((state) => state.project.structureMode)
  const currentFilePath = useStackStore((state) => state.currentFilePath)
  const isDirty = useStackStore((state) => state.isDirty)
  const [showExport, setShowExport] = useState(false)
  const [showExamples, setShowExamples] = useState(false)
  const [showRecovery, setShowRecovery] = useState(false)
  const [backupMtimeMs, setBackupMtimeMs] = useState(0)

  const { saveProject, saveProjectAs, loadProject } = useFileOperations()
  useAutoBackup()
  useBeforeClose()

  useEffect(() => {
    let mounted = true

    void window.oledApi
      .checkBackup()
      .then(({ exists, mtimeMs }) => {
        if (!mounted || !exists) {
          return
        }

        setBackupMtimeMs(mtimeMs)
        setShowRecovery(true)
      })
      .catch(() => undefined)

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey
      if (!mod) {
        return
      }

      const key = event.key.toLowerCase()
      if (key === 's' && !event.shiftKey) {
        event.preventDefault()
        void saveProject()
        return
      }

      if (key === 's' && event.shiftKey) {
        event.preventDefault()
        void saveProjectAs()
        return
      }

      if (key === 'o' && !event.shiftKey) {
        event.preventDefault()
        void loadProject()
        return
      }

      if (key === 'e') {
        event.preventDefault()
        setShowExport(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [loadProject, saveProject, saveProjectAs])

  useEffect(() => {
    const fileName = currentFilePath?.split(/[/\\]/).pop() ?? 'Untitled'
    const title = `${isDirty ? '*' : ''}${fileName} - OLED Stack Designer`
    window.oledApi.setWindowTitle(title).catch(() => undefined)
  }, [currentFilePath, isDirty])

  const handleRecover = async () => {
    try {
      const content = await window.oledApi.loadBackup()
      if (!content) {
        return
      }

      const parsed = JSON.parse(content) as Project
      useStackStore.getState().loadProjectFromData(parsed)
      await window.oledApi.deleteBackup()
      setShowRecovery(false)
    } catch {
      return
    }
  }

  const handleDismiss = async () => {
    await window.oledApi.deleteBackup()
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
