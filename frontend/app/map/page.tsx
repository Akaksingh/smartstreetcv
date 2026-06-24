'use client';
import { useEffect, useRef, useState } from 'react';
import { IssueRead } from '@/lib/types';
import { listIssues } from '@/lib/api';
import SeverityBadge from '@/components/SeverityBadge';
import Link from 'next/link';

const SEV_COLORS: Record<number, string> = { 1: '#1e8449', 2: '#d4ac0d', 3: '#d35400', 4: '#c0392b' };
const TYPE_LABELS: Record<string, string> = {
  pothole: 'Pothole', waterlogging: 'Waterlogging', open_manhole: 'Open Manhole',
  debris_dump: 'Debris Dump', encroachment: 'Encroachment',
  damaged_footpath: 'Damaged Footpath', open_drainage: 'Open Drainage',
  cattle_on_road: 'Cattle on Road', missing_road_sign: 'Missing Sign', other: 'Other',
};
const FILTERS = [
  { label: 'All Issues',      value: null, type: undefined },
  { label: 'Critical (S4)',   value: 4,    type: undefined },
  { label: 'High (S3)',       value: 3,    type: undefined },
  { label: 'Potholes',        value: null, type: 'pothole' },
  { label: 'Waterlogging',    value: null, type: 'waterlogging' },
  { label: 'Open Manholes',   value: null, type: 'open_manhole' },
];

export default function MapPage() {
  const mapRef        = useRef<HTMLDivElement>(null);
  const leafletRef    = useRef<unknown>(null);
  const [issues, setIssues]       = useState<IssueRead[]>([]);
  const [activeFilter, setFilter] = useState(0);
  const [selected, setSelected]   = useState<IssueRead | null>(null);
  const [stats, setStats]         = useState({ total: 0, critical: 0, open: 0 });

  useEffect(() => {
    listIssues({ limit: 100 }).then(data => {
      setIssues(data);
      setStats({
        total: data.length,
        critical: data.filter(i => i.severity === 4).length,
        open: data.filter(i => i.status === 'open').length,
      });
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current || leafletRef.current) return;
    import('leaflet').then(L => {
      // @ts-expect-error leaflet icon fix
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });
      const map = L.map(mapRef.current!, { center: [28.6139, 77.2090], zoom: 12, zoomControl: true });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors', maxZoom: 19,
      }).addTo(map);
      leafletRef.current = { map, L, markers: [] as unknown[] };
      navigator.geolocation?.getCurrentPosition(pos => {
        map.setView([pos.coords.latitude, pos.coords.longitude], 14);
      });
    });
  }, []);

  useEffect(() => {
    if (!leafletRef.current) return;
    const { map, L, markers } = leafletRef.current as {
      map: import('leaflet').Map;
      L: typeof import('leaflet');
      markers: import('leaflet').Marker[];
    };
    markers.forEach(m => m.remove());
    markers.length = 0;

    const f = FILTERS[activeFilter];
    const filtered = issues.filter(issue => {
      if (f.value && issue.severity !== f.value) return false;
      if (f.type && issue.issue_type !== f.type) return false;
      return issue.latitude != null && issue.longitude != null;
    });

    filtered.forEach(issue => {
      const color = SEV_COLORS[issue.severity] ?? '#6b7a94';
      const typeLabel = TYPE_LABELS[issue.issue_type] ?? issue.issue_type;
      const divIcon = L.divIcon({
        className: '',
        html: `<div style="width:28px;height:28px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:800;">S${issue.severity}</div>`,
        iconSize: [28, 28], iconAnchor: [14, 14],
      });

      const marker = L.marker([issue.latitude!, issue.longitude!], { icon: divIcon });
      marker.bindPopup(L.popup({ maxWidth: 260 }).setContent(`
        <div style="font-family:'Noto Sans',sans-serif">
          <p class="popup-type">${typeLabel}</p>
          <div style="display:flex;gap:6px;margin:6px 0;align-items:center">
            <span style="background:${color}22;color:${color};padding:2px 8px;border-radius:3px;font-size:11px;font-weight:700;border:1px solid ${color}44">S${issue.severity}</span>
            <span class="status-tag status-${issue.status}">${issue.status}</span>
          </div>
          ${issue.description_en ? `<p class="popup-desc">${issue.description_en.slice(0, 100)}${issue.description_en.length > 100 ? '…' : ''}</p>` : ''}
          ${issue.location_name ? `<p class="popup-location">${issue.location_name}</p>` : ''}
          <a href="/issue/${issue.id}" class="popup-link">View Full Report</a>
        </div>
      `));
      marker.on('click', () => setSelected(issue));
      marker.addTo(map);
      markers.push(marker);
    });
    (leafletRef.current as { markers: import('leaflet').Marker[] }).markers = markers;
  }, [issues, activeFilter]);

  return (
    <>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div className="page-content" style={{ paddingBottom: 24 }}>
        <div className="breadcrumb">
          <Link href="/">Home</Link>
          <span className="breadcrumb-sep">/</span>
          <span>Issue Map</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="page-title" style={{ marginBottom: 2 }}>Live Issue Map</h1>
            <p style={{ fontSize: 13, color: 'var(--text-light)' }}>
              {stats.total} total issues &nbsp;|&nbsp; {stats.critical} critical &nbsp;|&nbsp; {stats.open} open
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {FILTERS.map((f, i) => (
              <button
                key={i}
                className={`filter-btn${activeFilter === i ? ' active' : ''}`}
                onClick={() => setFilter(i)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="map-wrapper">
          {/* Sidebar */}
          <div className="map-sidebar">
            <div className="map-sidebar-header">
              Reported Issues ({issues.filter(i =>
                (!FILTERS[activeFilter].value || i.severity === FILTERS[activeFilter].value) &&
                (!FILTERS[activeFilter].type  || i.issue_type === FILTERS[activeFilter].type) &&
                i.latitude != null
              ).length})
            </div>
            <div className="map-issue-list">
              {issues.filter(i => i.latitude != null).map(issue => (
                <div
                  key={issue.id}
                  className="map-issue-item"
                  onClick={() => setSelected(issue)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="legend-dot" style={{ background: SEV_COLORS[issue.severity] }} />
                    <span className="map-issue-item-type">{TYPE_LABELS[issue.issue_type] ?? issue.issue_type}</span>
                    <span className={`status-tag status-${issue.status}`} style={{ marginLeft: 'auto' }}>{issue.status}</span>
                  </div>
                  <div className="map-issue-item-loc">{issue.location_name ?? `${issue.latitude?.toFixed(4)}, ${issue.longitude?.toFixed(4)}`}</div>
                </div>
              ))}
            </div>
            {selected && (
              <div style={{ padding: 14, borderTop: '1px solid var(--gray-200)', background: 'var(--gray-100)' }}>
                <p style={{ fontSize: 11, color: 'var(--gray-500)', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase' }}>Selected Issue</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy-dark)', marginBottom: 6 }}>{TYPE_LABELS[selected.issue_type] ?? selected.issue_type}</p>
                <SeverityBadge severity={selected.severity} />
                {selected.description_en && <p style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 8, lineHeight: 1.5 }}>{selected.description_en.slice(0, 120)}...</p>}
                <Link href={`/issue/${selected.id}`} className="btn btn-primary btn-sm btn-full" style={{ marginTop: 10 }}>View Full Report</Link>
              </div>
            )}
          </div>

          {/* Map */}
          <div className="map-container" style={{ position: 'relative' }}>
            <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
            <div className="map-legend">
              <p className="legend-title">Severity</p>
              {Object.entries(SEV_COLORS).map(([sev, color]) => (
                <div key={sev} className="legend-row">
                  <div className="legend-dot" style={{ background: color }} />
                  <span>Level {sev}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
