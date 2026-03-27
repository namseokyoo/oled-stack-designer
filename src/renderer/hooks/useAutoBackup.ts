import { useCallback, useEffect } from 'react'
import { selectSerializableProject, useStackStore } from '../stores/useStackStore'

const BACKUP_INTERVAL_MS = 5 * 60 * 1000

export function useAutoBackup() {
  const project = useStackStore(selectSerializableProject)
  const isDirty = useStackStore((state) => state.isDirty)

  const saveBackup = useCallback(async () => {
    if (!isDirty) {
      return
    }

    try {
      const tempPath = await window.oledApi.getTempPath()
      await window.oledApi.writeFile(tempPath, JSON.stringify(project, null, 2))
    } catch (error) {
      console.error('[AutoBackup] 백업 실패:', error)
    }
  }, [isDirty, project])

  const clearBackup = useCallback(async () => {
    try {
      const tempPath = await window.oledApi.getTempPath()
      await window.oledApi.unlinkFile(tempPath)
    } catch {
      return
    }
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      void saveBackup()
    }, BACKUP_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [saveBackup])

  useEffect(() => {
    if (!isDirty) {
      void clearBackup()
    }
  }, [clearBackup, isDirty])

  useEffect(() => {
    const handleBeforeUnload = () => {
      void clearBackup()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [clearBackup])

  return { saveBackup, clearBackup }
}
