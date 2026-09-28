'use client'

import { useEffect, useState } from 'react'
import { getValidationMatrix, type ValidationMatrixResponse } from '@/lib/nexafreight/client'
import { formatCheckValue, summarizeValidation } from '@/lib/nexafreight/validation'
import { ProvenanceChip } from '@/components/ProvenanceBadge'

/**
 * Task 17: public validation page — renders the LIVE reference-validation
 * matrix served by /api/health/validation (same implementation as the CI
 * gate). "No uncalibrated number on screen", visible to everyone.
 *
 * Wave 4: Reskinned as formal maritime technical calibration certificate
 * with Chartroom aesthetic (paper-first, hairline borders, corner ticks,
 * IBM Plex Mono for numerals, ProvenanceChip on all metrics).
 */
export default function ValidationPage() {
  const [matrix, setMatrix] = useState<ValidationMatrixResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getValidationMatrix()
      .then((m) => {
        if (!cancelled) setMatrix(m)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const summary = matrix ? summarizeValidation(matrix) : null

  return (
    <main className="validation-matrix-container">
      <div className="validation-matrix-card">
        <h1 className="validation-matrix-heading">Validation Matrix</h1>
        <p className="validation-matrix-description">
          Every model constant checked against published external references — the same
          checks that gate CI (eval/validate.py). {matrix ? `Generated ${new Date(matrix.generated_at).toLocaleString()}` : ''}
        </p>

        {error && (
          <div className="validation-status-banner validation-status-banner--error" role="alert">
            <div className="validation-status-banner__dot" />
            <div className="validation-status-banner__text">
              Failed to load the validation matrix: {error}
            </div>
          </div>
        )}

        {!matrix && !error && (
          <div className="empty-state-container">
            <div className="empty-state__heading">LOADING</div>
            <div className="skeleton-pulse skeleton-pulse--line" />
            <div className="skeleton-pulse skeleton-pulse--line skeleton-pulse--short" />
          </div>
        )}

        {summary && (
          <>
            <div
              className={`validation-status-banner ${summary.allOk ? 'validation-status-banner--success' : 'validation-status-banner--error'}`}
              data-testid="validation-banner"
            >
              <div className="validation-status-banner__dot" />
              <div className="validation-status-banner__text">
                {summary.allOk ? 'ALL CHECKS CALIBRATED' : 'VALIDATION FAILED'} — {summary.passCount}/{summary.totalCount} checks pass
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <ProvenanceChip provenance="CALIBRATED" size="xs" />
              </div>
            </div>

            {summary.skips.length > 0 && (
              <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                {summary.skips.map((s) => (
                  <div key={s} style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', fontFamily: 'var(--font-ui)' }}>
                    SKIP: {s}
                  </div>
                ))}
              </div>
            )}

            <table className="validation-table">
              <thead>
                <tr>
                  <th>Check</th>
                  <th>Actual</th>
                  <th>Reference</th>
                  <th>Tolerance</th>
                </tr>
              </thead>
              <tbody>
                {summary.ordered.map((row) => (
                  <tr key={row.name}>
                    <td>
                      <div className="validation-table__status">
                        <span className="validation-table__status-icon">
                          {row.ok ? '✅' : '❌'}
                        </span>
                        <span>{row.name}</span>
                        {row.one_sided && <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}> (one-sided)</span>}
                      </div>
                    </td>
                    <td className="validation-table__numeric">{formatCheckValue(row.actual)}</td>
                    <td className="validation-table__numeric">{formatCheckValue(row.ref)}</td>
                    <td className="validation-table__numeric">±{formatCheckValue(row.tol)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </main>
  )
}
