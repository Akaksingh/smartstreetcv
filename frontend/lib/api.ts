import { AnalysisResponse, IssueRead } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function analyzeImage(
  imageFile: File,
  latitude: number,
  longitude: number,
  locationName: string
): Promise<AnalysisResponse> {
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('latitude', String(latitude));
  formData.append('longitude', String(longitude));
  formData.append('location_name', locationName);

  const res = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function listIssues(params?: {
  severity_min?: number;
  issue_type?: string;
  status?: string;
  limit?: number;
}): Promise<IssueRead[]> {
  const qs = new URLSearchParams();
  if (params?.severity_min) qs.set('severity_min', String(params.severity_min));
  if (params?.issue_type) qs.set('issue_type', params.issue_type);
  if (params?.status) qs.set('status', params.status);
  qs.set('limit', String(params?.limit ?? 100));

  const res = await fetch(`${API_BASE}/issues?${qs}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getIssue(id: string): Promise<IssueRead> {
  const res = await fetch(`${API_BASE}/issues/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function getImageUrl(path: string): string {
  if (!path) return '';
  // Already a full HTTP URL
  if (path.startsWith('http')) return path;
  // New-style relative path: /complaints/uploads/...
  if (path.startsWith('/')) return `${API_BASE}${path}`;
  // Old-style absolute Windows path: D:\smartstreetcv\complaints\uploads\file.jpg
  // Extract the "complaints/..." portion
  const complaintsIdx = path.toLowerCase().indexOf('complaints');
  if (complaintsIdx !== -1) {
    const relative = path.slice(complaintsIdx).replace(/\\/g, '/');
    return `${API_BASE}/${relative}`;
  }
  return `${API_BASE}/${path}`;
}

export function reverseGeocode(lat: number, lng: number): Promise<string> {
  return fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
    { headers: { 'Accept-Language': 'en' } }
  )
    .then((r) => r.json())
    .then((d) => {
      const a = d.address || {};
      return (
        a.suburb ||
        a.neighbourhood ||
        a.village ||
        a.city_district ||
        a.county ||
        a.city ||
        'Unknown location'
      );
    })
    .catch(() => 'Unknown location');
}
