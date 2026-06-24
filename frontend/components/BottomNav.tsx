'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/', label: 'Report', icon: '📸' },
  { href: '/map', label: 'Map', icon: '🗺️' },
  { href: '/issues', label: 'Issues', icon: '📋' },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav className="bottom-nav">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={`nav-tab${path === t.href ? ' active' : ''}`}>
          <span className="nav-icon">{t.icon}</span>
          <span className="nav-label">{t.label}</span>
        </Link>
      ))}
    </nav>
  );
}
