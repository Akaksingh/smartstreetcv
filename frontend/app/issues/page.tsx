'use client';
import { useEffect, useState } from 'react';
import { IssueRead } from '@/lib/types';
import { listIssues } from '@/lib/api';
import SeverityBadge from '@/components/SeverityBadge';
import Link from 'next/link';

const TYPE_LABELS: Record<string, string> = {
  pothole: 'Pothole', waterlogging: 'Waterlogging', open_manhole: 'Open Manhole',
  debris_dump: 'Debris / Malba Dump', encroachment: 'Encroachment',
  damaged_footpath: 'Damaged Footpath', open_drainage: 'Open Drainage',
  cattle_on_road: 'Cattle on Road', missing_road_sign: 'Missing Road Sign', other: 'Other',
};

export default function IssuesPage() {
  const [issues, setIssues]   = useState<IssueRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState('all');

  useEffect(() => {
    listIssues({ limit: 100 })
      .then(d => { setIssues(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = filter === 'all'      ? issues
    : filter === 'critical' ? issues.filter(i => i.severity >= 3)
    : issues.filter(i => i.status === filter);

  const counts = {
    total: issues.length,
    critical: issues.filter(i => i.severity >= 3).length,
    open: issues.filter(i => i.status === 'open').length,
    resolved: issues.filter(i => i.status === 'resolved').length,
  };

  return (
    <div className="page-content">
      <div className="breadcrumb">
        <Link href="/">Home</Link>
        <span className="breadcrumb-sep">/</span>
        <span>All Issues</span>
      </div>

      <h1 className="page-title">Issue Registry</h1>
      <p className="page-subtitle">
        All civic issues reported by citizens. Use filters to narrow down by status or severity.
      </p>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-number">{counts.total}</div>
          <div className="stat-label">Total Issues</div>
        </div>
        <div className="stat-card red">
          <div className="stat-number">{counts.critical}</div>
          <div className="stat-label">High / Critical</div>
        </div>
        <div className="stat-card orange">
          <div className="stat-number">{counts.open}</div>
          <div className="stat-label">Open</div>
        </div>
        <div className="stat-card green">
          <div className="stat-number">{counts.resolved}</div>
          <div className="stat-label">Resolved</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <span className="filter-label">Filter by:</span>
        {[
          { label: `All (${counts.total})`,              value: 'all' },
          { label: `High / Critical (${counts.critical})`, value: 'critical' },
          { label: `Open (${counts.open})`,               value: 'open' },
          { label: `Resolved (${counts.resolved})`,       value: 'resolved' },
        ].map(f => (
          <button
            key={f.value}
            className={`filter-btn${filter === f.value ? ' active' : ''}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="panel">
        <div className="section-header">
          {filtered.length} Issue{filtered.length !== 1 ? 's' : ''} Found
        </div>
        {loading ? (
          <div className="progress-box">
            <div className="spinner" />
            <p className="progress-title">Loading issue registry...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state-title">No issues found</p>
            <p className="empty-state-sub">Try selecting a different filter, or submit a new report.</p>
          </div>
        ) : (
          <>
            <table className="issue-table">
              <thead>
                <tr>
                  <th>Issue Type</th>
                  <th>Severity</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Reported</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(issue => (
                  <tr key={issue.id}>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--navy-dark)', fontSize: 14 }}>
                        {TYPE_LABELS[issue.issue_type] ?? issue.issue_type}
                      </span>
                      {issue.description_en && (
                        <p style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 3, lineHeight: 1.4 }}>
                          {issue.description_en.slice(0, 80)}{issue.description_en.length > 80 ? '...' : ''}
                        </p>
                      )}
                    </td>
                    <td><SeverityBadge severity={issue.severity} /></td>
                    <td style={{ fontSize: 13, color: 'var(--text-light)' }}>{issue.location_name ?? '—'}</td>
                    <td><span className={`status-tag status-${issue.status}`}>{issue.status}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>
                      {new Date(issue.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </td>
                    <td>
                      <Link href={`/issue/${issue.id}`} className="btn btn-sm btn-outline">
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
