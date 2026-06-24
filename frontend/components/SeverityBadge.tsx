const SEV_CONFIG: Record<number, { label: string; cls: string }> = {
  1: { label: 'Low',      cls: 'sev-1' },
  2: { label: 'Moderate', cls: 'sev-2' },
  3: { label: 'High',     cls: 'sev-3' },
  4: { label: 'Critical', cls: 'sev-4' },
};

export default function SeverityBadge({ severity }: { severity: number }) {
  const cfg = SEV_CONFIG[severity] ?? SEV_CONFIG[1];
  return (
    <span className={`severity-badge ${cfg.cls}`}>
      S{severity} — {cfg.label}
    </span>
  );
}
