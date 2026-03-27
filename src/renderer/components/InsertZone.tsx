import { useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { useStackStore } from '../stores/useStackStore'
import type { ChannelCode } from '../types'
import { INSERT_ZONE_HEIGHT } from './canvasShared'

interface InsertZoneProps {
  afterId?: string
  rgbMode?: boolean
  channelMode?: ChannelCode
}

export function InsertZone(props: InsertZoneProps) {
  return <InsertZoneWrapper {...props} />
}

export function InsertZoneWrapper({ afterId, rgbMode = false, channelMode }: InsertZoneProps) {
  const [hovered, setHovered] = useState(false)
  const [showPopover, setShowPopover] = useState(false)
  const addLayer = useStackStore((state) => state.addLayer)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!showPopover) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setShowPopover(false)
      }
    }

    document.addEventListener('click', handlePointerDown)
    return () => document.removeEventListener('click', handlePointerDown)
  }, [showPopover])

  const handleInsert = (appliesTo?: ChannelCode[]) => {
    addLayer(afterId, appliesTo)
    setShowPopover(false)
  }

  const handleActivate = () => {
    if (channelMode) {
      handleInsert([channelMode])
      return
    }

    if (rgbMode) {
      setShowPopover((current) => !current)
      return
    }

    handleInsert()
  }

  const rect = containerRef.current?.getBoundingClientRect()
  const popoverAbove = !rect || rect.top > 80

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        height: hovered ? 16 : INSERT_ZONE_HEIGHT,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        transition: 'height var(--duration-fast) var(--ease-smooth)'
      }}
    >
      <button
        type="button"
        onClick={handleActivate}
        style={{
          width: hovered ? 20 : '100%',
          height: hovered ? 20 : 1,
          borderRadius: hovered ? '50%' : 999,
          background: hovered ? 'var(--accent-blue)' : 'var(--surface-line-faint)',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--button-primary-text)',
          opacity: hovered ? 1 : 0.9,
          boxShadow: hovered ? 'var(--shadow-sm)' : 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          transition:
            'width var(--duration-fast) var(--ease-smooth), height var(--duration-fast) var(--ease-smooth), background var(--duration-fast) var(--ease-smooth)'
        }}
        title="여기에 새 레이어 추가"
      >
        {hovered ? <Plus size={14} /> : null}
      </button>

      {showPopover ? (
        <div
          style={{
            position: 'absolute',
            ...(popoverAbove ? { bottom: '100%', marginBottom: 4 } : { top: '100%', marginTop: 4 }),
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: 4,
            display: 'flex',
            gap: 4,
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          <button
            type="button"
            onClick={() => handleInsert(['r', 'g', 'b'])}
            style={{
              padding: '4px 8px',
              fontSize: 11,
              fontWeight: 700,
              borderRadius: 'var(--radius-sm)',
              border: '1px solid transparent',
              cursor: 'pointer',
              background: 'transparent',
              color: 'var(--text-primary)'
            }}
          >
            공통층
          </button>
          <button
            type="button"
            onClick={() => handleInsert(['r'])}
            style={{
              padding: '4px 8px',
              fontSize: 11,
              fontWeight: 700,
              borderRadius: 'var(--radius-sm)',
              border: '1px solid transparent',
              cursor: 'pointer',
              background: 'transparent',
              color: 'var(--layer-eml-r)'
            }}
          >
            R 단독
          </button>
          <button
            type="button"
            onClick={() => handleInsert(['g'])}
            style={{
              padding: '4px 8px',
              fontSize: 11,
              fontWeight: 700,
              borderRadius: 'var(--radius-sm)',
              border: '1px solid transparent',
              cursor: 'pointer',
              background: 'transparent',
              color: 'var(--layer-eml-g)'
            }}
          >
            G 단독
          </button>
          <button
            type="button"
            onClick={() => handleInsert(['b'])}
            style={{
              padding: '4px 8px',
              fontSize: 11,
              fontWeight: 700,
              borderRadius: 'var(--radius-sm)',
              border: '1px solid transparent',
              cursor: 'pointer',
              background: 'transparent',
              color: 'var(--layer-eml-b)'
            }}
          >
            B 단독
          </button>
        </div>
      ) : null}
    </div>
  )
}
