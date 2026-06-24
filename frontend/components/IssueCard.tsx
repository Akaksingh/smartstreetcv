import SeverityBadge from './SeverityBadge';
import { IssueRead } from '@/lib/types';

const TYPE_ICONS: Record<string, string> = {
  pothole: '🕳️',
  waterlogging: '🌊',
  open_manhole: '⚠️',
  debris_dump: '🗑️',
  encroachment: '🚧',
  damaged_footpath: '🚶',
  open_drainage: '💧',
  cattle_on_road: '🐄',
  missing_road_sign: '🚫',
  other: '❗',
};

export default function IssueCard({ issue, compact = false }: { issue: IssueRead; compact?: boolean }) {
  const icon = TYPE_ICONS[issue.issue_type] ?? '❗';
  const label = issue.issue_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className={`issue-card ${compact ? 'compact' : ''}`}>
      {issue.image_url && (
        <div className="issue-card-image">
          <img src={issue.image_url} alt={label} />
        </div>
      )}
      <div className="issue-card-body">
        <div className="issue-card-header">
          <span className="issue-icon">{icon}</span>
          <span className="issue-type">{label}</span>
          <SeverityBadge severity={issue.severity} />
        </div>
        {!compact && (
          <>
            {issue.description_en && <p className="issue-desc">{issue.description_en}</p>}
            {issue.description_hi && (
              <p className="issue-desc-hi">{issue.description_hi}</p>
            )}
            {issue.location_name && (
              <p className="issue-location">📍 {issue.location_name}</p>
            )}
          </>
        )}
        <div className="issue-meta">
          <span className={`status-chip status-${issue.status}`}>{issue.status}</span>
          <span className="issue-date">
            {new Date(issue.created_at).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
