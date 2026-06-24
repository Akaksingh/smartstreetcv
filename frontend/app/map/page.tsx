'use client';
import { useEffect, useState, useRef } from 'react';
import { IssueRead } from '@/lib/types';
import { listIssues } from '@/lib/api';
import SeverityBadge from '@/components/SeverityBadge';
import Link from 'next/link';

const SEVERITY_COLORS: Record<number, string> = {
  1: '#22c55e',
  2: '#eab308',
  3: '#f97316',
  4: '#ef4444',
};

const TYPE_ICONS: Record<string, string> = {
  pothole: '🕳️', waterlogging: '🌊', open_manhole: '⚠️',
  debris_dump: '🗑️', encroachment: '🚧', damaged_footpath: '🚶',
  open_drainage: '💧', cattle_on_road: '🐄', missing_road_sign: '🚫', other: '❗',
};

const FILTERS = [
  { label: '🗺️ All', value: null },
  { label: '🔴 Critical', value: 4 },
  { label: '🟠 High', value: 3 },
  { label: '🕳️ Potholes', type: 'pothole', value: null },
  { label: '🌊 Waterlogging', type: 'waterlogging', value: null },
];

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<unknown>(null);
  const [issues, setIssues] = useState<IssueRead[]>([]);
  const [activeFilter, setActiveFilter] = useState(0);
  const [stats, setStats] = useState({ total: 0, critical: 0, open: 0 });

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

    // Dynamically import Leaflet (SSR-safe)
    import('leaflet').then(L => {
      // Fix default icon path issue in Next.js
      // @ts-expect-error leaflet icon fix
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      const map = L.map(mapRef.current!, {
        center: [28.6139, 77.2090],
        zoom: 12,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© CartoDB',
        maxZoom: 19,
      }).addTo(map);

      leafletRef.current = { map, L, markers: [] as unknown[] };

      // Try to center on user location
      navigator.geolocation?.getCurrentPosition(pos => {
        map.setView([pos.coords.latitude, pos.coords.longitude], 14);
      });
    });
  }, []);

  // Re-render markers when issues or filter changes
  useEffect(() => {
    if (!leafletRef.current) return;
    const { map, L, markers } = leafletRef.current as {
      map: import('leaflet').Map;
      L: typeof import('leaflet');
      markers: import('leaflet').Marker[];
    };

    // Clear existing markers
    markers.forEach(m => m.remove());
    markers.length = 0;

    const filter = FILTERS[activeFilter];
    const filtered = issues.filter(issue => {
      if (filter.value && issue.severity !== filter.value) return false;
      if ('type' in filter && filter.type && issue.issue_type !== filter.type) return false;
      return issue.latitude != null && issue.longitude != null;
    });

    filtered.forEach(issue => {
      const color = SEVERITY_COLORS[issue.severity] ?? '#94a3b8';
      const icon = TYPE_ICONS[issue.issue_type] ?? '❗';
      const typeLabel = issue.issue_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

      const divIcon = L.divIcon({
        className: '',
        html: `<div style="width:32px;height:32px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-size:15px;border:2px solid rgba(255,255,255,0.3);box-shadow:0 2px 8px rgba(0,0,0,0.4)">${icon}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([issue.latitude!, issue.longitude!], { icon: divIcon });

      const popup = L.popup({ maxWidth: 240 }).setContent(`
        <div class="popup-card">
          <div class="popup-icon-row">
            <span style="font-size:18px">${icon}</span>
            <span class="popup-type">${typeLabel}</span>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin:2px 0">
            <span style="background:${color}22;color:${color};padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700">S${issue.severity}</span>
            <span style="background:rgba(255,255,255,0.05);color:#94a3b8;padding:2px 8px;border-radius:10px;font-size:11px">${issue.status}</span>
          </div>
          ${issue.description_en ? `<p class="popup-desc">${issue.description_en.slice(0, 100)}${issue.description_en.length > 100 ? '…' : ''}</p>` : ''}
          ${issue.location_name ? `<p class="popup-location">📍 ${issue.location_name}</p>` : ''}
          <a href="/issue/${issue.id}" class="popup-link">View Details →</a>
        </div>
      `);

      marker.bindPopup(popup).addTo(map);
      markers.push(marker);
    });

    (leafletRef.current as { markers: import('leaflet').Marker[] }).markers = markers;
  }, [issues, activeFilter]);

  return (
    <div className="map-page">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />

      <div className="map-topbar">
        <div className="map-title-row">
          <span className="map-logo">Nagar<span>AI</span></span>
          <div style={{ display: 'flex', gap: 12, marginLeft: 'auto', flexShrink: 0 }}>
            {stats.critical > 0 && (
              <span style={{ fontSize: 12, color: '#f87171', fontWeight: 700 }}>
                🔴 {stats.critical} Critical
              </span>
            )}
            <span style={{ fontSize: 12, color: '#94a3b8' }}>{stats.total} Issues</span>
          </div>
        </div>

        <div className="map-filters">
          {FILTERS.map((f, i) => (
            <button
              key={i}
              className={`filter-pill${activeFilter === i ? ' active' : ''}`}
              onClick={() => setActiveFilter(i)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="map-container">
        <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
      </div>

      <div className="map-legend">
        {Object.entries(SEVERITY_COLORS).map(([sev, color]) => (
          <div key={sev} className="legend-row">
            <div className="legend-dot" style={{ background: color }} />
            <span>Severity {sev}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
