'use client';
import { useRef, useState, useCallback } from 'react';
import { analyzeImage, reverseGeocode } from '@/lib/api';
import { AnalysisResponse } from '@/lib/types';

interface Props {
  onResult: (result: AnalysisResponse, preview: string) => void;
  onError: (msg: string) => void;
}

type Step = 'idle' | 'preview' | 'locating' | 'uploading' | 'analyzing';

export default function CameraCapture({ onResult, onError }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('idle');
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number; name: string } | null>(null);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setStep('locating');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const name = await reverseGeocode(lat, lng);
        setLocation({ lat, lng, name });
        setStep('preview');
      },
      (err) => {
        console.warn('GPS failed:', err);
        setLocation({ lat: 28.6139, lng: 77.209, name: 'New Delhi' });
        setStep('preview');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!file || !location) return;
    setStep('analyzing');
    try {
      const result = await analyzeImage(file, location.lat, location.lng, location.name);
      onResult(result, preview!);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Analysis failed';
      onError(msg);
      setStep('preview');
    }
  }, [file, location, preview, onResult, onError]);

  const handleReset = () => {
    setStep('idle');
    setPreview(null);
    setFile(null);
    setLocation(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="camera-capture">
      {/* Hidden file input — opens camera on mobile */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {step === 'idle' && (
        <button className="btn-report" onClick={() => fileRef.current?.click()}>
          <span className="btn-report-icon">📸</span>
          <span>Report an Issue</span>
          <span className="btn-report-sub">Tap to open camera</span>
        </button>
      )}

      {step === 'locating' && (
        <div className="status-box">
          <div className="spinner" />
          <p>Getting your location…</p>
        </div>
      )}

      {step === 'preview' && preview && location && (
        <div className="preview-box">
          <img src={preview} alt="Preview" className="preview-img" />
          <div className="preview-meta">
            <span className="preview-location">📍 {location.name}</span>
            <span className="preview-coords">
              {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
            </span>
          </div>
          <div className="preview-actions">
            <button className="btn-secondary" onClick={handleReset}>↩ Retake</button>
            <button className="btn-primary" onClick={handleAnalyze}>Analyze with AI →</button>
          </div>
        </div>
      )}

      {step === 'analyzing' && (
        <div className="status-box analyzing">
          <div className="pulse-ring" />
          <div className="ai-icon">🤖</div>
          <p className="analyzing-text">AI is analyzing your photo…</p>
          <p className="analyzing-sub">Detecting road issues & generating report</p>
        </div>
      )}
    </div>
  );
}
