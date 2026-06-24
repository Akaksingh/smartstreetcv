'use client';
import { useState, useCallback } from 'react';
import CameraCapture from '@/components/CameraCapture';
import AnalysisResult from '@/components/AnalysisResult';
import IssueCard from '@/components/IssueCard';
import { AnalysisResponse, IssueRead } from '@/lib/types';
import { listIssues } from '@/lib/api';
import { useEffect } from 'react';

export default function HomePage() {
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<IssueRead[]>([]);

  useEffect(() => {
    listIssues({ limit: 3 }).then(setRecent).catch(() => {});
  }, [result]);

  const handleResult = useCallback((r: AnalysisResponse, p: string) => {
    setResult(r);
    setPreview(p);
    setError(null);
  }, []);

  const handleReset = useCallback(() => {
    setResult(null);
    setPreview('');
    setError(null);
  }, []);

  return (
    <>
      <header className="page-header">
        <div className="logo-mark">🏙️</div>
        <span className="logo-text">Nagar<span>AI</span></span>
      </header>

      {!result ? (
        <>
          <div className="hero">
            <div className="hero-badge">
              <span>🇮🇳</span> Built for Indian Cities
            </div>
            <h1>Report Road Issues<br /><span>with AI</span></h1>
            <p className="hero-sub">
              Tap the button below, take a photo, and let AI detect potholes, waterlogging,
              open manholes and more — instantly.
            </p>
          </div>

          {error && (
            <div style={{ margin: '0 20px', padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, color: '#f87171', fontSize: 13 }}>
              ⚠️ {error}
            </div>
          )}

          <CameraCapture onResult={handleResult} onError={setError} />

          {recent.length > 0 && (
            <div className="recent-section">
              <p className="recent-title">Recent Reports</p>
              <div className="recent-grid">
                {recent.map(issue => (
                  <IssueCard key={issue.id} issue={issue} compact />
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <AnalysisResult result={result} imagePreview={preview} onReset={handleReset} />
      )}
    </>
  );
}
