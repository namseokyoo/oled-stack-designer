import { useCallback, useEffect } from 'react'
import { selectSerializableProject, useStackStore } from '../stores/useStackStore'

const BACKUP_INTERVAL_MS = 5 * 60 * 1000
const AUTOSAVE_INTERVAL_MS = 5 * 60 * 1000

export function useAutoBackup() {
  const project = useStackStore(selectSerializableProject)
  const isDirty = useStackStore((state) => state.isDirty)
  const setLastAutosaveTime = useStackStore((state) => state.setLastAutosaveTime)

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

  const runAutosave = useCallback(async () => {
    try {
      await window.oledApi.autosaveSave(JSON.stringify(project, null, 2))
      setLastAutosaveTime(new Date())
    } catch (error) {
      console.error('[Autosave] 자동 저장 실패:', error)
    }
  }, [project, setLastAutosaveTime])

  // 기존 단일 백업 (비정상 종료 감지용)
  useEffect(() => {
    const timer = window.setInterval(() => {
      void saveBackup()
    }, BACKUP_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [saveBackup])

  // 5분 자동저장 (FIFO 3개 유지)
  useEffect(() => {
    const timer = window.setInterval(() => {
      void runAutosave()
    }, AUTOSAVE_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [runAutosave])

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
