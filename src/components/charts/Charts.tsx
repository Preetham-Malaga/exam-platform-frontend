// PURPOSE: Lightweight SVG/CSS charts (bar and donut) in the theme colours; no chart library needed.
// WHY: Dashboards need simple charts; keeping them dependency-free keeps the bundle small. Each chart has a text alternative.
// DEPENDS ON: theme CSS variables.

export interface Datum {
  label: string;
  value: number;
}
const PALETTE = [
  'var(--color-primary)',
  'var(--color-secondary)',
  'var(--color-success)',
  'var(--color-warning)',
  'var(--color-error)',
];

export function BarChart({
  data,
  height = 160,
  ariaLabel,
}: {
  data: Datum[];
  height?: number;
  ariaLabel: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const barW = 100 / Math.max(1, data.length);
  return (
    <figure>
      <svg
        viewBox={`0 0 100 ${height / 4}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={ariaLabel}
        className="w-full"
        style={{ height }}
      >
        {data.map((d, i) => {
          const h = (d.value / max) * (height / 4 - 4);
          return (
            <rect
              key={d.label}
              x={i * barW + barW * 0.15}
              y={height / 4 - h}
              width={barW * 0.7}
              height={Math.max(h, d.value > 0 ? 0.5 : 0)}
              rx={0.8}
              fill="var(--color-primary)"
            >
              <title>{`${d.label}: ${d.value}`}</title>
            </rect>
          );
        })}
      </svg>
      <figcaption className="mt-1 flex justify-between text-[11px] text-muted">
        <span>{data[0]?.label}</span>
        <span>{data.at(-1)?.label}</span>
      </figcaption>
    </figure>
  );
}

export function DonutChart({ data, ariaLabel }: { data: Datum[]; ariaLabel: string }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = 40;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 100 100" role="img" aria-label={ariaLabel} className="h-32 w-32 -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-border)" strokeWidth="14" />
        {total > 0 &&
          data.map((d, i) => {
            const len = (d.value / total) * c;
            const el = (
              <circle
                key={d.label}
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke={PALETTE[i % PALETTE.length]}
                strokeWidth="14"
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
              >
                <title>{`${d.label}: ${d.value}`}</title>
              </circle>
            );
            offset += len;
            return el;
          })}
      </svg>
      <ul className="space-y-1 text-sm">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: PALETTE[i % PALETTE.length] }}
              aria-hidden="true"
            />
            {d.label}: <strong>{d.value}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
