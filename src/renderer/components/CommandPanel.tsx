import type { CSSProperties, KeyboardEvent } from 'react'
import type { CurrentState } from '../agent/intentExecutor'
import type { ParserContext } from '../agent/intentParser'
import { ProposalPreview } from './ProposalPreview'
import { useAgentStore } from '../stores/useAgentStore'
import { useStackStore } from '../stores/useStackStore'

const styles: Record<string, CSSProperties> = {
  container: {
    borderTop: '1px solid var(--surface-line-faint)',
    background: 'var(--chrome-toolbar-bg)',
    backdropFilter: 'blur(18px)',
    WebkitBackdropFilter: 'blur(18px)',
    padding: '10px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    flexShrink: 0
  },
  inputRow: { display: 'flex', gap: 8, alignItems: 'center' },
  input: {
    flex: 1,
    height: 34,
    padding: '0 12px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--surface-line-faint)',
    background: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
    fontSize: 13,
    outline: 'none'
  },
  button: {
    height: 34,
    padding: '0 14px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid transparent',
    background: 'var(--accent-blue)',
    color: 'var(--button-primary-text)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer'
  },
  secondaryButton: {
    height: 30,
    padding: '0 12px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--surface-line-faint)',
    background: 'var(--bg-elevated)',
    color: 'var(--text-secondary)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer'
  },
  proposalBox: {
    padding: '10px 12px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--surface-line-faint)',
    background: 'var(--bg-surface)',
    fontSize: 12,
    color: 'var(--text-secondary)',
    display: 'flex',
    flexDirection: 'column',
    gap: 6
  },
  actionRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'center'
  },
  error: {
    color: 'var(--accent-red)',
    fontSize: 12
  },
  clarify: {
    color: 'var(--accent-orange)',
    fontSize: 12
  },
  success: {
    color: 'var(--accent-green)',
    fontSize: 12
  },
  explain: {
    padding: '8px 12px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--surface-line-faint)',
    background: 'var(--bg-surface)',
    fontSize: 12,
    color: 'var(--text-secondary)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4
  },
  hint: {
    color: 'var(--text-muted)',
    fontSize: 11
  }
}

export function CommandPanel() {
  const inputText = useAgentStore((state) => state.inputText)
  const isProcessing = useAgentStore((state) => state.isProcessing)
  const currentProposal = useAgentStore((state) => state.currentProposal)
  const proposalStatus = useAgentStore((state) => state.proposalStatus)
  const lastError = useAgentStore((state) => state.lastError)
  const lastClarifyQuestion = useAgentStore((state) => state.lastClarifyQuestion)
  const explainText = useAgentStore((state) => state.explainText)
  const setInputText = useAgentStore((state) => state.setInputText)
  const submitIntent = useAgentStore((state) => state.submitIntent)
  const approveProposal = useAgentStore((state) => state.approveProposal)
  const rejectProposal = useAgentStore((state) => state.rejectProposal)
  const structureMode = useStackStore((state) => state.project.structureMode)
  const previousLayers = useStackStore((state) => state.project.stacks[0]?.layers ?? [])

  const handleSubmit = () => {
    if (isProcessing || inputText.trim().length === 0) {
      return
    }

    const project = useStackStore.getState().project
    const layers = project.stacks[0]?.layers ?? []
    const context: ParserContext = {
      structureMode: project.structureMode === 'compare' ? 'single' : project.structureMode,
      layers: layers.map((layer) => ({ id: layer.id, name: layer.name, role: layer.role }))
    }
    const currentState: CurrentState = {
      project,
      currentLayers: layers,
      structureMode: project.structureMode
    }

    submitIntent(context, currentState)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) {
      return
    }

    event.preventDefault()
    handleSubmit()
  }

  return (
    <section style={styles.container}>
      <div style={styles.inputRow}>
        <input
          type="text"
          value={inputText}
          onChange={(event) => setInputText(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="예: HTL 50nm NPB 추가, ETL 삭제, RGB로 전환"
          style={styles.input}
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isProcessing || inputText.trim().length === 0}
          style={{
            ...styles.button,
            opacity: isProcessing || inputText.trim().length === 0 ? 0.5 : 1,
            cursor:
              isProcessing || inputText.trim().length === 0 ? 'not-allowed' : 'pointer'
          }}
        >
          {isProcessing ? '처리 중...' : '실행'}
        </button>
      </div>

      {structureMode === 'compare' ? (
        <div style={styles.hint}>Compare 모드에서는 미리보기만 가능하며 적용은 거부됩니다.</div>
      ) : null}

      {proposalStatus === 'preview' && currentProposal ? (
        <ProposalPreview
          proposal={currentProposal}
          previousLayers={previousLayers}
          onApprove={approveProposal}
          onReject={rejectProposal}
        />
      ) : null}

      {proposalStatus === 'rejected' && lastError ? (
        <div style={styles.error}>{lastError}</div>
      ) : null}

      {lastClarifyQuestion ? (
        <div style={styles.clarify}>
          <div>{lastClarifyQuestion}</div>
          <div style={styles.hint}>예: "HTL 두께 60nm으로", "EML 재료 CBP로 변경"</div>
        </div>
      ) : null}

      {proposalStatus === 'applied' ? (
        <div style={styles.success}>제안이 적용되었습니다.</div>
      ) : null}

      {explainText ? (
        <div style={styles.explain}>
          <strong style={{ fontSize: 12, color: 'var(--text-primary)' }}>구조 설명</strong>
          <div>{explainText}</div>
        </div>
      ) : null}
    </section>
  )
}
