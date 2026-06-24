import { AnalysisResponse } from '@/lib/types';
import SeverityBadge from './SeverityBadge';
import Link from 'next/link';

const TYPE_ICONS: Record<string, string> = {
  pothole: '🕳️', waterlogging: '🌊', open_manhole: '⚠️',
  debris_dump: '🗑️', encroachment: '🚧', damaged_footpath: '🚶',
  open_drainage: '💧', cattle_on_road: '🐄', missing_road_sign: '🚫', other: '❗',
};

interface Props {
  result: AnalysisResponse;
  imagePreview: string;
  onReset: () => void;
}

export default function AnalysisResult({ result, imagePreview, onReset }: Props) {
  const hasIssues = result.issues_detected.length > 0;

  return (
    <div className="result-container">
      <div className="result-header">
        <span className="result-status-icon">{hasIssues ? '🔍' : '✅'}</span>
        <h2 className="result-title">
          {hasIssues ? `${result.issues_detected.length} Issue${result.issues_detected.length > 1 ? 's' : ''} Detected` : 'Road looks clear!'}
        </h2>
        <p className="result-time">Analyzed in {result.processing_time.toFixed(1)}s</p>
      </div>

      <img src={imagePreview} alt="Analyzed" className="result-image" />

      {hasIssues ? (
        <div className="issues-list">
          {result.issues_detected.map((issue, i) => {
            const icon = TYPE_ICONS[issue.issue_type] ?? '❗';
            const label = issue.issue_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            return (
              <div key={i} className="result-issue-card">
                <div className="result-issue-top">
                  <span className="result-issue-icon">{icon}</span>
                  <div className="result-issue-info">
                    <span className="result-issue-type">{label}</span>
                    <SeverityBadge severity={issue.severity} />
                  </div>
                  {issue.confidence && (
                    <span className="result-confidence">{Math.round(issue.confidence * 100)}%</span>
                  )}
                </div>
                {issue.description_english && (
                  <p className="result-desc-en">{issue.description_english}</p>
                )}
                {issue.description_hindi && (
                  <p className="result-desc-hi">{issue.description_hindi}</p>
                )}
                {issue.recommended_action && (
                  <div className="result-action">
                    <span>🔧</span> {issue.recommended_action}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="no-issues">
          <p>No road issues detected. The road condition appears to be acceptable.</p>
        </div>
      )}

      <div className="result-actions">
        <button className="btn-secondary" onClick={onReset}>📸 Report Another</button>
        <Link href="/map" className="btn-primary">🗺️ View on Map</Link>
      </div>

      <p className="result-id">Report ID: <code>{result.issue_id.slice(0, 8)}…</code></p>
    </div>
  );
}
