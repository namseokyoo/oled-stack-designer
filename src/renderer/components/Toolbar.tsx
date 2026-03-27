import { Download, FolderOpen, Layers3, Palette, Rows3, Save, Scaling } from 'lucide-react'
import { useStackStore } from '../stores/useStackStore'
import { useFileOperations } from '../hooks/useFileOperations'
import type { StructureMode } from '../types'

const STRUCTURE_OPTIONS = [
  { value: 'single', label: 'Single', enabled: true },
  { value: 'rgb', label: 'RGB', enabled: true },
  { value: 'compare', label: 'Compare', enabled: true }
] as const

const PALETTES = ['classic', 'pastel', 'vivid'] as const

interface ToolbarProps {
  onExport: () => void
}

export function Toolbar({ onExport }: ToolbarProps) {
  const structureMode = useStackStore((state) => state.project.structureMode)
  const palette = useStackStore((state) => state.project.palette)
  const thicknessMode = useStackStore((state) => state.thicknessMode)
  const currentFilePath = useStackStore((state) => state.currentFilePath)
  const isDirty = useStackStore((state) => state.isDirty)
  const setStructureMode = useStackStore((state) => state.setStructureMode)
  const setPalette = useStackStore((state) => state.setPalette)
  const toggleThicknessMode = useStackStore((state) => state.toggleThicknessMode)
  const { saveProject, loadProject } = useFileOperations()

  const fileName = currentFilePath?.split(/[/\\]/).pop() ?? 'Untitled'
  const displayName = isDirty ? `*${fileName}` : fileName

  return (
    <header
      style={{
        height: 52,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 18px',
        borderBottom: '1px solid var(--surface-line-faint)',
        background: 'var(--chrome-toolbar-bg)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        flexShrink: 0,
        position: 'relative',
        zIndex: 10
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 4 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--accent-active), var(--accent-blue))',
            display: 'grid',
            placeItems: 'center',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <Layers3 size={15} color="var(--button-primary-text)" />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.1 }}>OLED Stack Designer</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.1 }}>
            M5 Save/Export
          </div>
        </div>
      </div>

      <div style={{ width: 1, height: 24, background: 'var(--surface-line-faint)' }} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 3,
          padding: 4,
          borderRadius: 'var(--radius-lg)',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--surface-line-faint)'
        }}
      >
        <Rows3 size={14} color="var(--text-muted)" style={{ margin: '0 6px' }} />
        {STRUCTURE_OPTIONS.map((option) => {
          const active = structureMode === option.value
          return (
            <button
              key={option.value}
              type="button"
              disabled={!option.enabled}
              onClick={() => option.enabled && setStructureMode(option.value as StructureMode)}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-md)',
                background: active ? 'var(--surface-active)' : 'transparent',
                color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                fontSize: 12,
                fontWeight: active ? 700 : 500,
                opacity: option.enabled ? 1 : 0.45,
                transition:
                  'background var(--duration-fast) var(--ease-smooth), color var(--duration-fast) var(--ease-smooth)'
              }}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={toggleThicknessMode}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '7px 12px',
          borderRadius: 'var(--radius-lg)',
          border: `1px solid ${thicknessMode === 'real' ? 'var(--border-active)' : 'var(--surface-line-faint)'}`,
          background: thicknessMode === 'real' ? 'var(--surface-accent-soft)' : 'var(--bg-elevated)',
          color: thicknessMode === 'real' ? 'var(--text-primary)' : 'var(--text-muted)',
          transition: 'all var(--duration-fast) var(--ease-smooth)'
        }}
        title="두께 모드 전환 (Uniform ↔ Real Thickness)"
      >
        <Scaling size={14} />
        <span style={{ fontSize: 12, fontWeight: thicknessMode === 'real' ? 700 : 500 }}>
          {thicknessMode === 'uniform' ? 'Uniform' : 'Real'}
        </span>
      </button>

      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            minWidth: 0,
            maxWidth: 220,
            padding: '7px 12px',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--surface-line-faint)',
            color: isDirty ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontSize: 12,
            fontWeight: 700,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
          title={displayName}
        >
          {displayName}
        </div>
        <button
          type="button"
          onClick={() => {
            void loadProject()
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 12px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--surface-line-faint)',
            background: 'var(--bg-elevated)',
            color: 'var(--text-secondary)',
            fontSize: 12,
            fontWeight: 700
          }}
          title="열기 (Ctrl+O)"
        >
          <FolderOpen size={14} />
          열기
        </button>
        <button
          type="button"
          onClick={() => {
            void saveProject()
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 12px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--surface-line-faint)',
            background: 'var(--bg-elevated)',
            color: 'var(--text-secondary)',
            fontSize: 12,
            fontWeight: 700
          }}
          title="저장 (Ctrl+S)"
        >
          <Save size={14} />
          저장
        </button>
        <button
          type="button"
          onClick={onExport}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 12px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-active)',
            background: 'var(--surface-accent-soft)',
            color: 'var(--text-primary)',
            fontSize: 12,
            fontWeight: 700
          }}
          title="내보내기 (Ctrl+E)"
        >
          <Download size={14} />
          내보내기
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
          <Palette size={14} />
          <span style={{ fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Palette
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: 4,
            borderRadius: 'var(--radius-lg)',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--surface-line-faint)'
          }}
        >
          {PALETTES.map((entry) => {
            const active = entry === palette
            return (
              <button
                key={entry}
                type="button"
                onClick={() => setPalette(entry)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-pill)',
                  border: `1px solid ${active ? 'var(--border-active)' : 'transparent'}`,
                  background: active ? 'var(--surface-accent-soft)' : 'transparent',
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontSize: 11,
                  fontWeight: active ? 700 : 600,
                  textTransform: 'capitalize',
                  transition:
                    'border-color var(--duration-fast) var(--ease-smooth), background var(--duration-fast) var(--ease-smooth)'
                }}
              >
                {entry}
              </button>
            )
          })}
        </div>
      </div>
    </header>
  )
}
