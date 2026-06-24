'use client';
import { useState, useCallback, useEffect } from 'react';
import CameraCapture from '@/components/CameraCapture';
import SeverityBadge from '@/components/SeverityBadge';
import { AnalysisResponse, IssueRead } from '@/lib/types';
import { listIssues } from '@/lib/api';
import Link from 'next/link';

const TYPE_LABELS: Record<string, string> = {
  pothole: 'Pothole', waterlogging: 'Waterlogging', open_manhole: 'Open Manhole',
  debris_dump: 'Debris / Malba Dump', encroachment: 'Encroachment',
  damaged_footpath: 'Damaged Footpath', open_drainage: 'Open Drainage',
  cattle_on_road: 'Cattle on Road', missing_road_sign: 'Missing Road Sign', other: 'Other Issue',
};

export default function HomePage() {
  const [result, setResult]   = useState<AnalysisResponse | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [error, setError]     = useState<string | null>(null);
  const [recent, setRecent]   = useState<IssueRead[]>([]);

  useEffect(() => {
    listIssues({ limit: 5 }).then(setRecent).catch(() => {});
  }, [result]);

  const handleResult = useCallback((r: AnalysisResponse, p: string) => {
    setResult(r); setPreview(p); setError(null);
  }, []);

  const handleReset = useCallback(() => {
    setResult(null); setPreview(''); setError(null);
  }, []);

  return (
    <div className="page-content">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link href="/">Home</Link>
        <span className="breadcrumb-sep">/</span>
        <span>{result ? 'Analysis Result' : 'Report an Issue'}</span>
      </div>

      {!result ? (
        <>
          <h1 className="page-title">Submit Civic Issue Report</h1>
          <p className="page-subtitle">
            Upload a photograph of a road or civic infrastructure issue. Our AI will automatically
            identify the problem, assess severity, and generate a formal complaint in Hindi and English.
          </p>

          {error && <div className="error-banner">Error: {error}</div>}

          <div className="report-grid">
            {/* Left: Upload */}
            <div>
              <div className="section-header">Step 1 — Upload Photograph</div>
              <div className="panel" style={{ borderTop: 'none', borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
                <div className="panel-body">
                  <CameraCapture onResult={handleResult} onError={setError} />
                </div>
              </div>
            </div>

            {/* Right: Instructions */}
            <div>
              <div className="section-header">How to Report an Issue</div>
              <div className="panel" style={{ borderTop: 'none', borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
                <div className="panel-body">
                  <ol style={{ paddingLeft: 18, fontSize: 14, color: 'var(--text-light)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <li><strong style={{ color: 'var(--navy-dark)' }}>Upload a photo</strong> of the road or civic issue clearly showing the problem.</li>
                    <li><strong style={{ color: 'var(--navy-dark)' }}>Allow location access</strong> so your GPS coordinates are captured automatically.</li>
                    <li><strong style={{ color: 'var(--navy-dark)' }}>Click Analyze</strong> — our AI model will detect the issue type, severity, and generate a formal description in Hindi.</li>
                    <li><strong style={{ color: 'var(--navy-dark)' }}>Review the result</strong> and view it on the live map where other citizens can see the hotspot.</li>
                  </ol>
                  <div style={{ marginTop: 20, padding: '12px 14px', background: 'var(--gray-100)', borderRadius: 'var(--radius)', border: '1px solid var(--gray-200)' }}>
                    <p style={{ fontSize: 12, color: 'var(--text-light)', fontWeight: 700, marginBottom: 4 }}>DETECTABLE ISSUE TYPES</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {Object.values(TYPE_LABELS).map(l => (
                        <span key={l} style={{ fontSize: 11, background: 'var(--white)', border: '1px solid var(--gray-300)', borderRadius: 3, padding: '2px 8px', color: 'var(--gray-700)' }}>
                          {l}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Reports */}
          {recent.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <div className="section-header">Recent Reports</div>
              <div className="panel" style={{ borderTop: 'none', borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
                <table className="issue-table">
                  <thead>
                    <tr>
                      <th>Issue Type</th>
                      <th>Severity</th>
                      <th>Location</th>
                      <th>Status</th>
                      <th>Reported</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map(issue => (
                      <tr key={issue.id}>
                        <td style={{ fontWeight: 600, color: 'var(--navy-dark)' }}>
                          {TYPE_LABELS[issue.issue_type] ?? issue.issue_type}
                        </td>
                        <td><SeverityBadge severity={issue.severity} /></td>
                        <td style={{ color: 'var(--text-light)', fontSize: 12 }}>{issue.location_name ?? '—'}</td>
                        <td><span className={`status-tag status-${issue.status}`}>{issue.status}</span></td>
                        <td style={{ color: 'var(--gray-500)', fontSize: 12 }}>
                          {new Date(issue.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td>
                          <Link href={`/issue/${issue.id}`} className="btn btn-sm btn-outline">View</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ padding: '12px 16px', borderTop: '1px solid var(--gray-200)', textAlign: 'right' }}>
                  <Link href="/issues" className="btn btn-sm btn-primary">View All Reports</Link>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* --- RESULT VIEW --- */
        <>
          <h1 className="page-title">Analysis Report</h1>
          <p className="page-subtitle">
            AI analysis complete. The following civic issues have been identified and recorded.
          </p>

          {/* Alert Banner */}
          <div className={`result-alert ${result.issues_detected.length > 0 ? (result.severity_max >= 3 ? 'danger' : 'warning') : 'success'}`}>
            {result.issues_detected.length > 0
              ? <><strong>{result.issues_detected.length} issue{result.issues_detected.length > 1 ? 's' : ''} detected</strong> — Maximum severity: Level {result.severity_max}. Processed in {result.processing_time.toFixed(1)}s.</>
              : <><strong>No issues detected.</strong> The road in this photograph appears to be in acceptable condition.</>
            }
          </div>

          <div className="report-grid">
            {/* Left: Photo */}
            <div>
              <div className="section-header">Submitted Photograph</div>
              <div className="panel" style={{ borderTop: 'none', borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
                <div className="panel-body">
                  <img src={preview} alt="Analyzed road" className="preview-image" />
                  <p style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 8 }}>
                    Report ID: <code style={{ fontFamily: 'monospace', color: 'var(--teal)' }}>{result.issue_id}</code>
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Issues */}
            <div>
              <div className="section-header">Detected Issues ({result.issues_detected.length})</div>
              <div className="panel" style={{ borderTop: 'none', borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
                <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {result.issues_detected.length === 0 ? (
                    <p style={{ color: 'var(--text-light)', fontSize: 14 }}>No civic issues detected in this image.</p>
                  ) : (
                    result.issues_detected.map((issue, i) => (
                      <div key={i} className={`issue-result-card sev-${issue.severity}`}>
                        <div className="issue-result-header">
                          <span className="issue-type-label">
                            {TYPE_LABELS[issue.issue_type] ?? issue.issue_type}
                          </span>
                          <SeverityBadge severity={issue.severity} />
                          {issue.confidence && (
                            <span style={{ fontSize: 11, color: 'var(--gray-500)', fontWeight: 600 }}>
                              {Math.round(issue.confidence * 100)}% confidence
                            </span>
                          )}
                        </div>
                        {issue.description_english && (
                          <p className="issue-desc-en">{issue.description_english}</p>
                        )}
                        {issue.description_hindi && (
                          <div>
                            <p className="action-label">Hindi Description (हिंदी विवरण)</p>
                            <p className="issue-desc-hi">{issue.description_hindi}</p>
                          </div>
                        )}
                        {issue.recommended_action && (
                          <div className="issue-action-box">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                            </svg>
                            <span><strong>Recommended action:</strong> {issue.recommended_action}</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}

                  <div style={{ display: 'flex', gap: 10, paddingTop: 8, borderTop: '1px solid var(--gray-200)' }}>
                    <button className="btn btn-outline" onClick={handleReset} style={{ flex: 1 }}>
                      Report Another Issue
                    </button>
                    <Link href="/map" className="btn btn-primary" style={{ flex: 1 }}>
                      View on Map
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
