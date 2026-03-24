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

      const answer = window.confirm(
        '저장하지 않은 변경사항이 있습니다.\n저장하고 종료하시겠습니까?\n\n[확인] 저장 후 종료 / [취소] 종료 취소'
      )

      if (!answer) {
        await window.oledApi.cancelClose()
        return
      }

      const saved = await saveProject()
      if (saved) {
        await window.oledApi.confirmClose()
        return
      }

      await window.oledApi.cancelClose()
    })

    return unsubscribe
  }, [isDirty, saveProject])
}
