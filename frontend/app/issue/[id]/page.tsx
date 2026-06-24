'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { IssueRead } from '@/lib/types';
import { getIssue } from '@/lib/api';
import SeverityBadge from '@/components/SeverityBadge';

const TYPE_ICONS: Record<string, string> = {
  pothole: '🕳️', waterlogging: '🌊', open_manhole: '⚠️',
  debris_dump: '🗑️', encroachment: '🚧', damaged_footpath: '🚶',
  open_drainage: '💧', cattle_on_road: '🐄', missing_road_sign: '🚫', other: '❗',
};

export default function IssueDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [issue, setIssue] = useState<IssueRead | null>(null);
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
        center: [issue.latitude!, issue.longitude!],
        zoom: 15, zoomControl: false, dragging: false, scrollWheelZoom: false,
      });
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
      L.marker([issue.latitude!, issue.longitude!]).addTo(map);
    });
  }, [issue]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <div className="spinner" />
    </div>
  );

  if (!issue) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Issue not found.</div>
  );

  const icon = TYPE_ICONS[issue.issue_type] ?? '❗';
  const typeLabel = issue.issue_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div className="detail-page">
        <button className="back-btn" onClick={() => router.back()}>← Back</button>

        {issue.image_url && (
          <img src={issue.image_url} alt={typeLabel} className="detail-image" />
        )}

        <div className="detail-card">
          <div className="detail-type-row">
            <span style={{ fontSize: 28 }}>{icon}</span>
            <span className="detail-type">{typeLabel}</span>
            <SeverityBadge severity={issue.severity} />
          </div>

          {issue.description_en && (
            <div>
              <p style={{ fontSize: 11, color: '#64748b', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Description</p>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: '#cbd5e1' }}>{issue.description_en}</p>
            </div>
          )}

          {issue.description_hi && (
            <div>
              <p style={{ fontSize: 11, color: '#64748b', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>हिंदी विवरण</p>
              <p className="result-desc-hi">{issue.description_hi}</p>
            </div>
          )}

          {issue.recommended_action && (
            <div className="result-action">
              <span>🔧</span> {issue.recommended_action}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span className={`status-chip status-${issue.status}`}>{issue.status}</span>
            {issue.overall_condition && (
              <span style={{ fontSize: 11, color: '#94a3b8', padding: '3px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: 10 }}>
                Road: {issue.overall_condition}
              </span>
            )}
            {issue.affected_area_m2 && (
              <span style={{ fontSize: 11, color: '#94a3b8', padding: '3px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: 10 }}>
                ~{issue.affected_area_m2} m²
              </span>
            )}
          </div>

          {issue.location_name && (
            <p style={{ fontSize: 13, color: '#94a3b8' }}>📍 {issue.location_name}</p>
          )}

          <p style={{ fontSize: 11, color: '#475569' }}>
            Reported: {new Date(issue.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        </div>

        {issue.latitude && issue.longitude && (
          <div className="mini-map" ref={miniMapRef} />
        )}

        <p style={{ fontSize: 11, color: '#475569', textAlign: 'center' }}>
          ID: <code style={{ color: '#6366f1' }}>{issue.id}</code>
        </p>
      </div>
    </>
  );
}
