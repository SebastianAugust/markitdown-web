function Doc({ x, label }: { x: number; label: string }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <path d="M2 2h22l10 10v34a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" />
      <path d="M24 2v10h10" />
      <text x="17" y="38" textAnchor="middle" fontSize="12" fontFamily="var(--nf-mono)" fill="currentColor" stroke="none">
        {label}
      </text>
    </g>
  );
}

export function DocIllustration() {
  return (
    <svg width="132" height="52" viewBox="0 0 132 52" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-muted">
      <Doc x={0} label="PDF" />
      <path d="M48 26h30m-7-7 7 7-7 7" className="text-accent" stroke="var(--accent)" />
      <Doc x={90} label=".md" />
    </svg>
  );
}
