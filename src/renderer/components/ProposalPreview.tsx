import type { CSSProperties } from 'react'
import type { Proposal } from '../agent/intentExecutor'
import { buildDiffSummary, type DiffEntry } from '../agent/proposalDiff'
import type { Layer } from '../types'

interface ProposalPreviewProps {
  proposal: Proposal
  previousLayers: Layer[]
  onApprove: () => void
  onReject: () => void
}

const styles: Record<string, CSSProperties> = {
  container: {
    padding: '12px 14px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--surface-line-faint)',
    background: 'var(--bg-surface)',
    display: 'flex',
    flexDirection: 'column',
    gap: 12
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4
  },
  title: {
    margin: 0,
    color: 'var(--text-primary)',
    fontSize: 13,
    fontWeight: 700
  },
  subtitle: {
    margin: 0,
    color: 'var(--text-secondary)',
    fontSize: 12,
    lineHeight: 1.5
  },
  dangerBanner: {
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start',
    padding: '10px 12px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--accent-red)',
    background: 'rgba(255, 159, 67, 0.10)'
  },
  dangerIcon: {
    width: 18,
    height: 18,
    borderRadius: 999,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    background: 'var(--accent-red)',
    color: 'var(--button-primary-text)',
    fontSize: 12,
    fontWeight: 700
  },
  dangerContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6
  },
  dangerTitle: {
    margin: 0,
    color: 'var(--text-primary)',
    fontSize: 12,
    fontWeight: 700
  },
  dangerList: {
    margin: 0,
    paddingLeft: 18,
    color: 'var(--text-secondary)',
    fontSize: 12,
    lineHeight: 1.5
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6
  },
  sectionLabel: {
    color: 'var(--text-primary)',
    fontSize: 12,
    fontWeight: 700
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  tableHeadCell: {
    padding: '0 0 8px 0',
    textAlign: 'left',
    color: 'var(--text-muted)',
    fontSize: 11,
    fontWeight: 600,
    borderBottom: '1px solid var(--surface-line-faint)'
  },
  tableRow: {
    borderBottom: '1px solid var(--surface-line-faint)'
  },
  tableCell: {
    padding: '8px 0',
    verticalAlign: 'top',
    color: 'var(--text-primary)',
    fontSize: 12
  },
  layerName: {
    fontWeight: 600
  },
  details: {
    color: 'var(--text-muted)',
    lineHeight: 1.5
  },
  emptyState: {
    padding: '10px 0',
    color: 'var(--text-muted)',
    fontSize: 12
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
    padding: '4px 8px',
    borderRadius: 999,
    border: '1px solid var(--surface-line-faint)',
    background: 'var(--bg-elevated)',
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase'
  },
  assumptionsBox: {
    margin: 0,
    paddingLeft: 18,
    color: 'var(--text-secondary)',
    fontSize: 12,
    lineHeight: 1.5
  },
  warningsBox: {
    margin: 0,
    paddingLeft: 18,
    color: 'var(--accent-orange)',
    fontSize: 12,
    lineHeight: 1.5
  },
  confirmText: {
    color: 'var(--text-primary)',
    fontSize: 12,
    fontWeight: 600
  },
  actionRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'center'
  },
  primaryButton: {
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
    height: 34,
    padding: '0 14px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--surface-line-faint)',
    background: 'var(--bg-elevated)',
    color: 'var(--text-secondary)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer'
  }
}

function getBadgeStyle(type: DiffEntry['type']): CSSProperties {
  switch (type) {
    case 'added':
      return {
        ...styles.badge,
        color: 'var(--accent-green)'
      }

    case 'removed':
      return {
        ...styles.badge,
        color: 'var(--accent-red)'
      }

    case 'modified':
      return {
        ...styles.badge,
        color: 'var(--accent-orange)'
      }

    case 'reordered':
      return {
        ...styles.badge,
        color: 'var(--text-muted)'
      }
  }
}

function getBadgeLabel(type: DiffEntry['type']): string {
  switch (type) {
    case 'added':
      return 'Added'
    case 'removed':
      return 'Removed'
    case 'modified':
      return 'Modified'
    case 'reordered':
      return 'Reordered'
  }
}

export function ProposalPreview({
  proposal,
  previousLayers,
  onApprove,
  onReject
}: ProposalPreviewProps) {
  const diff = buildDiffSummary(proposal, previousLayers)

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <p style={styles.title}>제안 미리보기</p>
        <p style={styles.subtitle}>{proposal.description}</p>
      </div>

      {diff.isDangerous ? (
        <div style={styles.dangerBanner}>
          <div style={styles.dangerIcon}>!</div>
          <div style={styles.dangerContent}>
            <p style={styles.dangerTitle}>주의가 필요한 변경입니다.</p>
            <ul style={styles.dangerList}>
              {diff.dangerousReasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <div style={styles.section}>
        <div style={styles.sectionLabel}>변경 내역</div>
        {diff.entries.length > 0 ? (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.tableHeadCell}>유형</th>
                <th style={styles.tableHeadCell}>레이어</th>
                <th style={styles.tableHeadCell}>세부 내용</th>
              </tr>
            </thead>
            <tbody>
              {diff.entries.map((entry, index) => (
                <tr key={`${entry.type}-${entry.layerName}-${index}`} style={styles.tableRow}>
                  <td style={styles.tableCell}>
                    <span style={getBadgeStyle(entry.type)}>{getBadgeLabel(entry.type)}</span>
                  </td>
                  <td style={styles.tableCell}>
                    <span style={styles.layerName}>{entry.layerName}</span>
                  </td>
                  <td style={styles.tableCell}>
                    <span style={styles.details}>{entry.details}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={styles.emptyState}>변경 없음</div>
        )}
      </div>

      {proposal.assumptions.length > 0 ? (
        <div style={styles.section}>
          <div style={styles.sectionLabel}>가정</div>
          <ul style={styles.assumptionsBox}>
            {proposal.assumptions.map((assumption) => (
              <li key={assumption}>{assumption}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {proposal.warnings.length > 0 ? (
        <div style={styles.section}>
          <div style={{ ...styles.sectionLabel, color: 'var(--accent-orange)' }}>경고</div>
          <ul style={styles.warningsBox}>
            {proposal.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {diff.isDangerous ? (
        <div style={styles.confirmText}>
          정말 적용하시겠습니까? 이 작업은 되돌리기 가능합니다.
        </div>
      ) : null}

      <div style={styles.actionRow}>
        <button type="button" onClick={onApprove} style={styles.primaryButton}>
          적용
        </button>
        <button type="button" onClick={onReject} style={styles.secondaryButton}>
          취소
        </button>
      </div>
    </div>
  )
}
