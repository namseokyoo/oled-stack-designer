import { create } from 'zustand'
import { applyAgentIntent, type CurrentState, type Proposal } from '../agent/intentExecutor'
import { explainCompareStructure, explainStructure } from '../agent/explainHandler'
import {
  parseNaturalLanguage,
  type ParserContext
} from '../agent/intentParser'
import { useStackStore } from './useStackStore'

function buildExplainText(currentState: CurrentState): string {
  if (currentState.structureMode !== 'compare') {
    return explainStructure(currentState.currentLayers, currentState.structureMode)
  }

  const devices = useStackStore.getState().devices

  if (devices.length === 0) {
    const baseSlots = currentState.currentLayers.length > 0 ? [{ layers: currentState.currentLayers }] : []
    return explainCompareStructure(baseSlots, [], currentState.structureMode)
  }

  return explainCompareStructure(
    devices.slice(0, 1).map((device) => ({ layers: device.layers })),
    devices.slice(1).map((device) => ({ layers: device.layers })),
    currentState.structureMode
  )
}

export interface AgentStore {
  inputText: string
  isProcessing: boolean
  currentProposal: Proposal | null
  proposalStatus: 'idle' | 'pending' | 'preview' | 'applied' | 'rejected'
  lastError: string | null
  lastClarifyQuestion: string | null
  explainText: string | null
  setInputText: (text: string) => void
  submitIntent: (context: ParserContext, currentState: CurrentState) => void
  approveProposal: () => void
  rejectProposal: () => void
  clearState: () => void
}

export const useAgentStore = create<AgentStore>((set, get) => ({
  inputText: '',
  isProcessing: false,
  currentProposal: null,
  proposalStatus: 'idle',
  lastError: null,
  lastClarifyQuestion: null,
  explainText: null,

  setInputText: (text) =>
    set((state) => ({
      inputText: text,
      ...(state.proposalStatus === 'rejected' ||
      state.proposalStatus === 'applied' ||
      state.lastClarifyQuestion ||
      state.explainText
        ? {
            proposalStatus: 'idle',
            lastError: null,
            lastClarifyQuestion: null,
            explainText: null
          }
        : {})
    })),

  submitIntent: (context, currentState) => {
    const { inputText } = get()

    set({
      isProcessing: true,
      proposalStatus: 'pending',
      currentProposal: null,
      lastError: null,
      lastClarifyQuestion: null,
      explainText: null
    })

    const parseResult = parseNaturalLanguage(inputText, context)

    if (!parseResult.intent) {
      set({
        isProcessing: false,
        proposalStatus: 'rejected',
        lastError: '명령을 인식하지 못했습니다. 더 구체적으로 입력해주세요.'
      })
      return
    }

    if (parseResult.intent.category === 'explain') {
      const explanationString = buildExplainText(currentState)

      set({
        isProcessing: false,
        proposalStatus: 'idle',
        currentProposal: null,
        explainText: explanationString,
        lastError: null,
        lastClarifyQuestion: null
      })
      return
    }

    const executionResult = applyAgentIntent(parseResult.intent, currentState)

    switch (executionResult.status) {
      case 'proposal':
        set({
          isProcessing: false,
          currentProposal: executionResult.proposal,
          proposalStatus: 'preview',
          lastError: null,
          lastClarifyQuestion: null,
          explainText: null
        })
        break
      case 'rejected':
        set({
          isProcessing: false,
          proposalStatus: 'rejected',
          lastError: executionResult.reasons.join(', '),
          currentProposal: null,
          lastClarifyQuestion: null,
          explainText: null
        })
        break
      case 'clarify':
        set({
          isProcessing: false,
          proposalStatus: 'idle',
          lastClarifyQuestion: executionResult.question,
          lastError: null,
          currentProposal: null,
          explainText: null
        })
        break
    }
  },

  approveProposal: () => {
    const { currentProposal } = get()

    if (!currentProposal) {
      return
    }

    useStackStore.getState().applyProposal(currentProposal.nextProject)

    set({
      proposalStatus: 'applied',
      currentProposal: null,
      inputText: '',
      lastError: null,
      lastClarifyQuestion: null,
      explainText: null
    })
  },

  rejectProposal: () => {
    set({
      currentProposal: null,
      proposalStatus: 'idle',
      lastError: null,
      lastClarifyQuestion: null,
      explainText: null
    })
  },

  clearState: () => {
    set({
      inputText: '',
      isProcessing: false,
      currentProposal: null,
      proposalStatus: 'idle',
      lastError: null,
      lastClarifyQuestion: null,
      explainText: null
    })
  }
}))
