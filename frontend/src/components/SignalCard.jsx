import { COLORS } from '../constants'

function timeLeft(expiresAt) {
  const t = new Date(expiresAt).getTime() - Date.now()
  if (t <= 0) return 'Expired'
  const m = Math.floor(t / 60000)
  const h = Math.floor(m / 60)
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`
}

export function SignalCard({ signal, onAct, expired }) {
  const long = signal.direction === 'LONG'
  return (
    <div
      className={`animate-ae-fade-in rounded border border-ae-border p-3 font-mono text-xs ${
        expired ? 'opacity-50' : 'bg-ae-card'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-display text-base font-extrabold">{signal.pair}</span>
        <span className="text-ae-mid">{signal.timeframe}</span>
        <span
          className="rounded px-2 py-0.5 text-[10px] font-bold"
          style={{
            background: long ? 'rgba(0,229,160,0.12)' : 'rgba(255,61,107,0.12)',
            color: long ? COLORS.green : COLORS.red,
          }}
        >
          {signal.direction}
        </span>
        <span
          className={`rounded px-2 py-0.5 text-[10px] ${
            signal.confidence === 'HIGH'
              ? 'bg-ae-green/10 text-ae-green'
              : signal.confidence === 'LOW'
                ? 'bg-ae-panel text-ae-mid'
                : 'bg-ae-amber/10 text-ae-amber'
          }`}
        >
          {signal.confidence}
        </span>
      </div>
      <div className="mt-2 text-ae-mid">{signal.strategy_name}</div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
        <div>
          <div className="text-ae-dim">ENTRY</div>
          <div className="text-ae-text">{signal.entry_price}</div>
        </div>
        <div>
          <div className="text-ae-dim">STOP</div>
          <div className="text-ae-red">{signal.stop_loss}</div>
        </div>
        <div>
          <div className="text-ae-dim">TARGET</div>
          <div className="text-ae-green">{signal.take_profit}</div>
        </div>
      </div>
      <div className="mt-2 text-ae-mid">R:R {signal.rr_ratio}</div>
      <div className="mt-2 flex flex-wrap gap-1">
        {(signal.conditions || []).map((c) => (
          <span key={c} className="rounded border border-ae-border px-1.5 py-0.5 text-[10px] text-ae-mid">
            {c}
          </span>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-ae-mid">
        <span>{signal.created_at}</span>
        <span>{expired ? 'EXPIRED' : timeLeft(signal.expires_at)}</span>
      </div>
      {!expired && (
        <button
          type="button"
          className="mt-3 w-full rounded border border-ae-green/50 py-2 text-ae-green hover:bg-ae-green/10"
          onClick={() => onAct?.(signal)}
        >
          ACTING ON THIS
        </button>
      )}
    </div>
  )
}
