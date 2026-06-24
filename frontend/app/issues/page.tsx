'use client';
import { useEffect, useState } from 'react';
import { IssueRead } from '@/lib/types';
import { listIssues } from '@/lib/api';
import IssueCard from '@/components/IssueCard';

export default function IssuesPage() {
  const [issues, setIssues] = useState<IssueRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    listIssues({ limit: 100 }).then(d => { setIssues(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? issues
    : filter === 'critical' ? issues.filter(i => i.severity >= 3)
    : issues.filter(i => i.status === filter);

  return (
    <>
      <header className="page-header">
        <div className="logo-mark">📋</div>
        <span className="logo-text">All <span>Issues</span></span>
      </header>

      <div className="stats-bar">
        {[
          { label: `All (${issues.length})`, value: 'all' },
          { label: `🔴 Critical (${issues.filter(i => i.severity >= 3).length})`, value: 'critical' },
          { label: `🟠 Open (${issues.filter(i => i.status === 'open').length})`, value: 'open' },
          { label: `✅ Resolved (${issues.filter(i => i.status === 'resolved').length})`, value: 'resolved' },
        ].map(f => (
          <button
            key={f.value}
            className={`stat-chip${filter === f.value ? ' active' : ''}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="issues-page">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }} />
            <p>Loading issues…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
            <p style={{ fontSize: 32 }}>🎉</p>
            <p>No issues found. Great news!</p>
          </div>
        ) : (
          <div className="issues-grid">
            {filtered.map(issue => (
              <a key={issue.id} href={`/issue/${issue.id}`} style={{ display: 'block' }}>
                <IssueCard issue={issue} />
              </a>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
