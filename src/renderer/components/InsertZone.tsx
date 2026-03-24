import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useStackStore } from '../stores/useStackStore'

interface InsertZoneProps {
  afterId?: string
}

export function InsertZone(props: InsertZoneProps) {
  return <InsertZoneWrapper {...props} />
}

export function InsertZoneWrapper({ afterId }: InsertZoneProps) {
  const [hovered, setHovered] = useState(false)
  const addLayer = useStackStore((state) => state.addLayer)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => addLayer(afterId)}
      style={{
        height: 22,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        position: 'relative'
      }}
      title="여기에 새 레이어 추가"
    >
      <div
        style={{
          width: hovered ? 26 : '100%',
          height: hovered ? 26 : 1,
          borderRadius: hovered ? '50%' : 999,
          background: hovered ? 'var(--accent-blue)' : 'var(--surface-line-faint)',
          display: 'grid',
          placeItems: 'center',
          color: 'var(--button-primary-text)',
          opacity: hovered ? 1 : 0.9,
          boxShadow: hovered ? 'var(--shadow-sm)' : 'none',
          transition:
            'width var(--duration-fast) var(--ease-smooth), height var(--duration-fast) var(--ease-smooth), background var(--duration-fast) var(--ease-smooth)'
        }}
      >
        {hovered ? <Plus size={14} /> : null}
      </div>
    </div>
  )
}
