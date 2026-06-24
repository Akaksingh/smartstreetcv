'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { IssueRead } from '@/lib/types';
import { getIssue } from '@/lib/api';
import SeverityBadge from '@/components/SeverityBadge';
import Link from 'next/link';

const TYPE_LABELS: Record<string, string> = {
  pothole: 'Pothole', waterlogging: 'Waterlogging', open_manhole: 'Open Manhole',
  debris_dump: 'Debris / Malba Dump', encroachment: 'Encroachment',
  damaged_footpath: 'Damaged Footpath', open_drainage: 'Open Drainage',
  cattle_on_road: 'Cattle on Road', missing_road_sign: 'Missing Road Sign', other: 'Other',
};

export default function IssueDetailPage() {
  const params  = useParams();
  const router  = useRouter();
  const id      = params?.id as string;
  const [issue, setIssue]     = useState<IssueRead | null>(null);
  const [loading, setLoading] = useState(true);
  const miniMapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    getIssue(id).then(d => { setIssue(d); setLoading(false); }).catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!issue?.latitude || !issue?.longitude || !miniMapRef.current) return;
    import('leaflet').then(L => {
      // @ts-expect-error icon fix
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });
      const map = L.map(miniMapRef.current!, {
        center: [issue.latitude!, issue.longitude!], zoom: 15,
        zoomControl: false, dragging: false, scrollWheelZoom: false,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
      L.marker([issue.latitude!, issue.longitude!]).addTo(map);
    });
  }, [issue]);

  if (loading) return (
    <div className="page-content"><div className="progress-box"><div className="spinner" /><p>Loading issue details...</p></div></div>
  );

  if (!issue) return (
    <div className="page-content">
      <div className="empty-state">
        <p className="empty-state-title">Issue Not Found</p>
        <p className="empty-state-sub">The requested issue record does not exist.</p>
        <Link href="/issues" className="btn btn-primary" style={{ marginTop: 16, display: 'inline-flex' }}>Back to Registry</Link>
      </div>
    </div>
  );

  const typeLabel = TYPE_LABELS[issue.issue_type] ?? issue.issue_type;

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div className="page-content">
        <div className="breadcrumb">
          <Link href="/">Home</Link>
          <span className="breadcrumb-sep">/</span>
          <Link href="/issues">Issue Registry</Link>
          <span className="breadcrumb-sep">/</span>
          <span>{typeLabel}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <h1 className="page-title" style={{ margin: 0 }}>Issue Report: {typeLabel}</h1>
          <SeverityBadge severity={issue.severity} />
          <span className={`status-tag status-${issue.status}`}>{issue.status}</span>
        </div>

        <div className="detail-grid">
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Image */}
            {issue.image_url && (
              <div>
                <div className="section-header">Submitted Photograph</div>
                <div className="panel" style={{ borderTop: 'none', borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
                  <img src={issue.image_url} alt={typeLabel} className="detail-image" />
                </div>
              </div>
            )}

            {/* Descriptions */}
            <div>
              <div className="section-header">Issue Description</div>
              <div className="panel" style={{ borderTop: 'none', borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
                <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {issue.description_en && (
                    <div>
                      <p className="action-label">English Description</p>
                      <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.7 }}>{issue.description_en}</p>
                    </div>
                  )}
                  {issue.description_hi && (
                    <div>
                      <p className="action-label">हिंदी विवरण</p>
                      <p className="issue-desc-hi">{issue.description_hi}</p>
                    </div>
                  )}
                  {issue.recommended_action && (
                    <div>
                      <p className="action-label">Recommended Action</p>
                      <div className="issue-action-box">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                        </svg>
                        {issue.recommended_action}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Metadata */}
            <div>
              <div className="section-header">Issue Metadata</div>
              <div className="panel" style={{ borderTop: 'none', borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
                <div className="panel-body">
                  <div className="detail-info-row">
                    <div className="info-block">
                      <div className="info-block-label">Issue Type</div>
                      <div className="info-block-value">{typeLabel}</div>
                    </div>
                    <div className="info-block">
                      <div className="info-block-label">Severity</div>
                      <div className="info-block-value">Level {issue.severity}</div>
                    </div>
                    <div className="info-block">
                      <div className="info-block-label">Status</div>
                      <div className="info-block-value">{issue.status}</div>
                    </div>
                    {issue.confidence && (
                      <div className="info-block">
                        <div className="info-block-label">AI Confidence</div>
                        <div className="info-block-value">{Math.round(issue.confidence * 100)}%</div>
                      </div>
                    )}
                    {issue.overall_condition && (
                      <div className="info-block">
                        <div className="info-block-label">Road Condition</div>
                        <div className="info-block-value" style={{ textTransform: 'capitalize' }}>{issue.overall_condition}</div>
                      </div>
                    )}
                    {issue.affected_area_m2 && (
                      <div className="info-block">
                        <div className="info-block-label">Affected Area</div>
                        <div className="info-block-value">{issue.affected_area_m2} m²</div>
                      </div>
                    )}
                    {issue.is_safe_vehicles != null && (
                      <div className="info-block">
                        <div className="info-block-label">Safe for Vehicles</div>
                        <div className="info-block-value">{issue.is_safe_vehicles ? 'Yes' : 'No'}</div>
                      </div>
                    )}
                    {issue.is_safe_pedestrians != null && (
                      <div className="info-block">
                        <div className="info-block-label">Safe for Pedestrians</div>
                        <div className="info-block-value">{issue.is_safe_pedestrians ? 'Yes' : 'No'}</div>
                      </div>
                    )}
                    <div className="info-block" style={{ gridColumn: '1 / -1' }}>
                      <div className="info-block-label">Date Reported</div>
                      <div className="info-block-value">
                        {new Date(issue.created_at).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })}
                      </div>
                    </div>
                    {issue.location_name && (
                      <div className="info-block" style={{ gridColumn: '1 / -1' }}>
                        <div className="info-block-label">Location</div>
                        <div className="info-block-value">{issue.location_name}</div>
                      </div>
                    )}
                    <div className="info-block" style={{ gridColumn: '1 / -1' }}>
                      <div className="info-block-label">Report ID</div>
                      <div className="info-block-value" style={{ fontFamily: 'monospace', fontSize: 12 }}>{issue.id}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mini Map */}
            {issue.latitude && issue.longitude && (
              <div>
                <div className="section-header">Issue Location</div>
                <div className="mini-map-container" ref={miniMapRef} />
                <div style={{ padding: '8px 12px', background: 'var(--white)', border: '1px solid var(--gray-200)', borderTop: 'none', fontSize: 12, color: 'var(--text-light)' }}>
                  Coordinates: {issue.latitude.toFixed(5)}, {issue.longitude.toFixed(5)}
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-outline" onClick={() => router.back()} style={{ flex: 1 }}>Back</button>
              <Link href="/map" className="btn btn-primary" style={{ flex: 1 }}>View on Map</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
