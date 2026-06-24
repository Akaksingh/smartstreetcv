'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  {
    href: '/',
    label: 'Report Issue',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M12 5v14M5 12h14" />
      </svg>
    ),
  },
  {
    href: '/map',
    label: 'Issue Map',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3V7z" />
        <path d="M9 4v13M15 7v13" />
      </svg>
    ),
  },
  {
    href: '/issues',
    label: 'All Issues',
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    ),
  },
];

// Pre-computed Ashoka Chakra spoke endpoints (24 spokes × 15°)
// Using integer coordinates to avoid SSR/client hydration mismatch
const SPOKES: [number, number][] = [
  [90,50],[89,59],[85,67],[79,74],[71,79],[62,82],
  [52,90],[41,89],[32,85],[25,79],[20,71],[17,62],
  [10,50],[11,41],[15,33],[21,26],[29,21],[38,18],
  [50,10],[59,11],[68,15],[75,21],[80,29],[83,38],
];

export default function GovHeader() {
  const path = usePathname();

  return (
    <>
      {/* Top Government Bar */}
      <div className="gov-topbar">
        <div className="gov-topbar-inner">
          <div className="gov-emblem">
            <div className="gov-ashoka">
              <svg viewBox="0 0 100 100" width="28" height="28" aria-hidden="true">
                <circle cx="50" cy="50" r="44" fill="none" stroke="white" strokeWidth="5"/>
                <circle cx="50" cy="50" r="5" fill="white"/>
                {SPOKES.map(([x2, y2], i) => (
                  <line key={i} x1="50" y1="50" x2={x2} y2={y2} stroke="white" strokeWidth="2"/>
                ))}
              </svg>
            </div>
            <div className="gov-org-name">
              <span className="gov-org-en">NagarAI — Civic Issue Reporting Portal</span>
              <span className="gov-org-hi">नागर एआई — नागरिक शिकायत पोर्टल</span>
            </div>
          </div>
          <div className="gov-tagline">
            AI-Powered Infrastructure Monitoring<br />
            <span style={{ fontSize: 10 }}>Powered by Ollama · Built for Indian Cities</span>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="main-nav">
        <div className="nav-inner">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link${path === item.href ? ' active' : ''}`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
