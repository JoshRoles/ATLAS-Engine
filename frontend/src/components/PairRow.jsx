import { MiniChart } from './MiniChart'

function fmtVol(v) {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`
  return String(v?.toFixed?.(0) ?? '—')
}

export function PairRow({
  pair,
  price,
  stats,
  spark,
  badge,
  selected,
  onSelect,
}) {
  const ch = stats?.change_pct
  const pos = ch != null ? ch >= 0 : undefined
  const border =
    badge === 'trade'
      ? 'border-l-ae-green'
      : badge === 'signal'
        ? 'border-l-ae-amber'
        : 'border-l-transparent'

  return (
    <button
      type="button"
      onClick={() => onSelect?.(pair.symbol)}
      className={`flex w-full items-center gap-2 border-l-4 px-3 py-2 text-left font-mono text-xs transition-colors ${
        selected ? 'bg-ae-green/10' : 'bg-ae-card hover:bg-ae-panel'
      } ${border}`}
    >
      <div className="w-24 shrink-0 font-display text-sm font-extrabold tracking-tight">
        {pair.display_name}
      </div>
      <div className="w-28 shrink-0 text-ae-text">
        {price != null ? price.toLocaleString(undefined, { maximumFractionDigits: 4 }) : '—'}
      </div>
      <div
        className={`w-16 shrink-0 ${pos === true ? 'text-ae-green' : pos === false ? 'text-ae-red' : 'text-ae-mid'}`}
      >
        {ch != null ? `${ch >= 0 ? '+' : ''}${ch.toFixed(2)}%` : '—'}
      </div>
      <div className="w-14 shrink-0 text-ae-mid">{fmtVol(stats?.quote_volume ?? stats?.volume)}</div>
      <div className="flex flex-1 justify-end">
        <MiniChart closes={spark} positive={pos} />
      </div>
      <div className="w-16 shrink-0 text-right">
        {badge === 'signal' && (
          <span className="rounded border border-ae-amber/40 bg-ae-amber/10 px-1.5 py-0.5 text-[10px] text-ae-amber">
            SIG
          </span>
        )}
        {badge === 'trade' && (
          <span className="rounded border border-ae-green/40 bg-ae-green/10 px-1.5 py-0.5 text-[10px] text-ae-green">
            TRADE
          </span>
        )}
      </div>
    </button>
  )
}
