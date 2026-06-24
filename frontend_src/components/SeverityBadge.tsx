import React from 'react';

const COLORS: Record<number, { bg: string; text: string; label: string }> = {
  1: { bg: '#166534', text: '#4ade80', label: 'Low' },
  2: { bg: '#854d0e', text: '#fbbf24', label: 'Moderate' },
  3: { bg: '#9a3412', text: '#fb923c', label: 'High' },
  4: { bg: '#7f1d1d', text: '#f87171', label: 'Critical' },
};

export default function SeverityBadge({ severity }: { severity: number }) {
  const s = COLORS[severity] ?? COLORS[1];
  return (
    <span
      style={{
        background: s.bg,
        color: s.text,
        padding: '3px 10px',
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: 0.5,
        display: 'inline-block',
      }}
    >
      S{severity} · {s.label}
    </span>
  );
}
