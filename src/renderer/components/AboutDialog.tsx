import { useEffect, useState } from 'react'
import { Layers3, X } from 'lucide-react'

interface AboutDialogProps {
  onClose: () => void
}

export function AboutDialog({ onClose }: AboutDialogProps) {
  const [version, setVersion] = useState('')

  useEffect(() => {
    window.oledApi.getAppVersion().then(setVersion).catch(() => undefined)
  }, [])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--overlay-backdrop)',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        zIndex: 1001
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 'min(360px, 100%)',
          padding: 32,
          borderRadius: 'var(--radius-xl)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--surface-line-faint)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          textAlign: 'center'
        }}
      >
        <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 'var(--radius-sm)'
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-violet))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Layers3 size={32} color="white" />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>OLED Stack Designer</h2>
          {version ? (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>버전 {version}</p>
          ) : null}
        </div>

        <div
          style={{
            fontSize: 13,
            color: 'var(--text-secondary)',
            display: 'flex',
            flexDirection: 'column',
            gap: 4
          }}
        >
          <p style={{ margin: 0 }}>제작: OC연구개발5팀 유남석</p>
          <p style={{ margin: 0 }}>Electron · React · TypeScript</p>
          <p style={{ margin: 0, marginTop: 4 }}>© 2026</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: 8,
            padding: '8px 24px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--surface-line-faint)',
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          닫기
        </button>
      </div>
    </div>
  )
}
