'use client';
import { useRef, useState, useCallback, useEffect } from 'react';
import { analyzeImage, reverseGeocode } from '@/lib/api';
import { AnalysisResponse } from '@/lib/types';

interface Props {
  onResult: (result: AnalysisResponse, preview: string) => void;
  onError: (msg: string) => void;
}

type Step = 'idle' | 'preview' | 'locating' | 'analyzing';
type GpsStatus = 'idle' | 'acquiring' | 'acquired' | 'failed';

export default function CameraCapture({ onResult, onError }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('idle');
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('idle');
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile on mount
  useEffect(() => {
    setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setStep('locating');
    setGpsStatus('acquiring');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const name = await reverseGeocode(lat, lng);
        setLocation({ lat, lng, name });
        setGpsStatus('acquired');
        setStep('preview');
      },
      () => {
        setLocation({ lat: 28.6139, lng: 77.2090, name: 'New Delhi (default)' });
        setGpsStatus('failed');
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
    setGpsStatus('idle');
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div>
      {/* Hidden file input — uses capture only on mobile */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        {...(isMobile ? { capture: 'environment' } : {})}
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {step === 'idle' && (
        <div
          className="upload-zone"
          onClick={() => fileRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
        >
          <div className="upload-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
          </div>
          <div>
            <p className="upload-title">Upload Road Photograph</p>
            <p className="upload-desc">
              {isMobile
                ? 'Tap to open camera and take a live photo of the road issue'
                : 'Click to select an image from your computer, or use your webcam'}
            </p>
          </div>
          <p className="upload-note">
            {isMobile
              ? 'Camera will open. Please take photo at the location of the issue.'
              : 'Supported formats: JPG, PNG, WEBP. Max 10MB.'}
          </p>
        </div>
      )}

      {step === 'locating' && (
        <div className="upload-zone" style={{ cursor: 'default' }}>
          <div className="spinner" />
          <p className="upload-title">Acquiring Location</p>
          <p className="upload-desc">Please allow location access when prompted by your browser.</p>
        </div>
      )}

      {step === 'preview' && preview && location && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <img src={preview} alt="Selected road image" className="preview-image" />

          {/* GPS Status */}
          <div className="gps-info">
            <div className={`gps-dot ${gpsStatus}`} />
            <div>
              <div className="gps-label">
                {gpsStatus === 'acquired' ? 'Location Captured' : 'Location (Default)'}
              </div>
              <div className="gps-value">
                {location.name} &nbsp;|&nbsp; {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
              </div>
              {gpsStatus === 'failed' && (
                <div style={{ fontSize: 11, color: '#7d6608', marginTop: 4 }}>
                  GPS unavailable. Default location used. You may submit manually.
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-outline" onClick={handleReset} style={{ flex: 1 }}>
              Select Different Image
            </button>
            <button className="btn btn-orange" onClick={handleAnalyze} style={{ flex: 2 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              Analyze with AI
            </button>
          </div>
        </div>
      )}

      {step === 'analyzing' && (
        <div className="progress-box">
          <div className="spinner" />
          <p className="progress-title">AI Analysis in Progress</p>
          <p className="progress-sub">
            Detecting road issues, estimating severity and generating Hindi report...
          </p>
          <p style={{ fontSize: 12, color: '#9aa5b4', marginTop: 4 }}>
            This may take 30–90 seconds depending on the model
          </p>
        </div>
      )}
    </div>
  );
}
