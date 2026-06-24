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

export default function GovHeader() {
  const path = usePathname();

  return (
    <>
      {/* Top Government Bar */}
      <div className="gov-topbar">
        <div className="gov-topbar-inner">
          <div className="gov-emblem">
            <div className="gov-ashoka">
              <svg viewBox="0 0 100 100" width="28" height="28" fill="#1a3a6b">
                <circle cx="50" cy="50" r="44" fill="none" stroke="#1a3a6b" strokeWidth="6"/>
                <circle cx="50" cy="50" r="4" fill="#1a3a6b"/>
                {Array.from({length: 24}).map((_, i) => (
                  <line
                    key={i}
                    x1="50" y1="50"
                    x2={50 + 40 * Math.cos((i * 15 * Math.PI) / 180)}
                    y2={50 + 40 * Math.sin((i * 15 * Math.PI) / 180)}
                    stroke="#1a3a6b" strokeWidth="2"
                  />
                ))}
              </svg>
            </div>
            <div className="gov-org-name">
              <span className="gov-org-en">NagarAI — Civic Issue Reporting Portal</span>
              <span className="gov-org-hi">नागर एआई — नागरिक शिकायत पोर्टल</span>
            </div>
          </div>
          <div className="gov-tagline">
            Government of India Initiative<br />
            <span style={{fontSize: 10}}>AI-powered Infrastructure Monitoring</span>
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
