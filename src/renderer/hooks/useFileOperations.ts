import { useCallback } from 'react'
import {
  selectSerializableProject,
  stripCompareState,
  useStackStore
} from '../stores/useStackStore'
import type { Project } from '../types'

const SCHEMA_VERSION = '1.0.0'

function validateProject(data: unknown): data is Project {
  if (typeof data !== 'object' || data === null) {
    return false
  }

  const project = data as Record<string, unknown>
  if (typeof project.schemaVersion !== 'string') {
    return false
  }

  if (typeof project.metadata !== 'object' || project.metadata === null) {
    return false
  }

  if (!Array.isArray(project.stacks)) {
    return false
  }

  return true
}

function getFileName(filePath: string | null): string {
  return filePath?.split(/[/\\]/).pop() ?? 'Untitled'
}

function createSavedProject(project: Project): Project {
  return {
    ...project,
    schemaVersion: SCHEMA_VERSION,
    metadata: {
      ...project.metadata,
      updatedAt: new Date().toISOString()
    }
  }
}

function getDefaultProjectName(name: string): string {
  return name.endsWith('.oledstack') || name.endsWith('.json') ? name : `${name}.oledstack`
}

export function useFileOperations() {
  const currentFilePath = useStackStore((state) => state.currentFilePath)
  const isDirty = useStackStore((state) => state.isDirty)
  const setCurrentFilePath = useStackStore((state) => state.setCurrentFilePath)
  const setDirty = useStackStore((state) => state.setDirty)
  const loadProjectFromData = useStackStore((state) => state.loadProjectFromData)
  const resetToNew = useStackStore((state) => state.resetToNew)

  const saveProject = useCallback(async (): Promise<boolean> => {
    try {
      const serializedProject = selectSerializableProject(useStackStore.getState())
      let filePath = currentFilePath

      if (!filePath) {
        filePath = await window.oledApi.showSaveDialog(
          getDefaultProjectName(serializedProject.metadata.name)
        )
        if (!filePath) {
          return false
        }
      }

      const savedProject = createSavedProject(serializedProject)
      await window.oledApi.writeFile(filePath, JSON.stringify(savedProject, null, 2))
      setCurrentFilePath(filePath)
      setDirty(false)
      useStackStore.setState(() => ({
        project: stripCompareState(savedProject),
        thicknessMode: savedProject.thicknessMode
      }))
      await window.oledApi.setRecentFile(filePath)
      await window.oledApi.setWindowTitle(`${getFileName(filePath)} - OLED Stack Designer`)
      return true
    } catch (error) {
      console.error('저장 실패:', error)
      alert('프로젝트를 저장하는 중 오류가 발생했습니다.')
      return false
    }
  }, [currentFilePath, setCurrentFilePath, setDirty])

  const saveProjectAs = useCallback(async (): Promise<boolean> => {
    try {
      const serializedProject = selectSerializableProject(useStackStore.getState())
      const filePath = await window.oledApi.showSaveDialog(
        getDefaultProjectName(serializedProject.metadata.name)
      )
      if (!filePath) {
        return false
      }

      const savedProject = createSavedProject(serializedProject)
      await window.oledApi.writeFile(filePath, JSON.stringify(savedProject, null, 2))
      setCurrentFilePath(filePath)
      setDirty(false)
      useStackStore.setState(() => ({
        project: stripCompareState(savedProject),
        thicknessMode: savedProject.thicknessMode
      }))
      await window.oledApi.setRecentFile(filePath)
      await window.oledApi.setWindowTitle(`${getFileName(filePath)} - OLED Stack Designer`)
      return true
    } catch (error) {
      console.error('다른 이름으로 저장 실패:', error)
      alert('프로젝트를 저장하는 중 오류가 발생했습니다.')
      return false
    }
  }, [setCurrentFilePath, setDirty])

  const loadProject = useCallback(
    async (filePath?: string): Promise<boolean> => {
      try {
        if (!filePath && isDirty) {
          const answer = await window.oledApi.showDirtyGuard()
          if (answer === 'cancel') {
            return false
          }

          if (answer === 'save') {
            const saved = await saveProject()
            if (!saved) {
              return false
            }
          }
        }

        const targetPath = filePath ?? (await window.oledApi.showOpenDialog())
        if (!targetPath) {
          return false
        }

        const content = await window.oledApi.readFile(targetPath)
        const data: unknown = JSON.parse(content)

        if (!validateProject(data)) {
          alert('파일 형식이 올바르지 않습니다.\n유효한 OLED Stack Project 파일을 선택하세요.')
          return false
        }

        loadProjectFromData(data)
        setCurrentFilePath(targetPath)
        await window.oledApi.setRecentFile(targetPath)
        await window.oledApi.setWindowTitle(`${getFileName(targetPath)} - OLED Stack Designer`)
        return true
      } catch (error) {
        console.error('불러오기 실패:', error)
        alert('파일을 불러오는 중 오류가 발생했습니다.')
        return false
      }
    },
    [isDirty, loadProjectFromData, saveProject, setCurrentFilePath]
  )

  const newProject = useCallback(async (): Promise<void> => {
    if (isDirty) {
      const answer = await window.oledApi.showDirtyGuard()
      if (answer === 'cancel') {
        return
      }

      if (answer === 'save') {
        const saved = await saveProject()
        if (!saved) {
          return
        }
      }
    }

    resetToNew()
    await window.oledApi.setWindowTitle('Untitled - OLED Stack Designer').catch(() => undefined)
  }, [isDirty, resetToNew, saveProject])

  return { saveProject, saveProjectAs, loadProject, newProject }
}
