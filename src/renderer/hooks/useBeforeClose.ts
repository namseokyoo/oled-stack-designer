import { useEffect } from 'react'
import { useStackStore } from '../stores/useStackStore'
import { useFileOperations } from './useFileOperations'

export function useBeforeClose() {
  const isDirty = useStackStore((state) => state.isDirty)
  const { saveProject } = useFileOperations()

  useEffect(() => {
    const unsubscribe = window.oledApi.onBeforeClose(async () => {
      if (!isDirty) {
        await window.oledApi.confirmClose()
        return
      }

      const answer = await window.oledApi.showDirtyGuard()

      if (answer === 'cancel') {
        await window.oledApi.cancelClose()
        return
      }

      if (answer === 'save') {
        const saved = await saveProject()
        if (!saved) {
          await window.oledApi.cancelClose()
          return
        }
      }

      await window.oledApi.confirmClose()
    })

    return unsubscribe
  }, [isDirty, saveProject])
}
