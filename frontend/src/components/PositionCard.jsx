export function PositionCard({ row, open, onClose }) {
  const pnl = row.pnl_usdt
  const posPnl = pnl != null && pnl >= 0
  return (
    <div className="rounded border border-ae-border bg-ae-card p-3 font-mono text-xs">
      <div className="flex items-center justify-between">
        <span className="font-display text-base font-extrabold">{row.pair}</span>
        <span
          className={`text-[10px] font-bold ${
            row.direction === 'LONG' ? 'text-ae-green' : 'text-ae-red'
          }`}
        >
          {row.direction}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-ae-mid">
        <div>
          Entry {row.entry_price} {open && row.current_price != null && (
            <>
              → <span className="text-ae-text">{row.current_price}</span>
            </>
          )}
        </div>
        <div>Size ${row.position_size_usdt}</div>
      </div>
      {open && row.stop_loss != null && row.take_profit != null && row.current_price != null && (
        <div className="mt-2 text-[10px] text-ae-mid">
          SL / TP monitoring active
        </div>
      )}
      {row.strategy_name && (
        <div className="mt-1 text-[10px] text-ae-dim">{row.strategy_name}</div>
      )}
      {!open && (
        <div className="mt-2 flex flex-wrap gap-2">
          <span className={posPnl ? 'text-ae-green' : 'text-ae-red'}>
            P&amp;L {row.pnl_usdt != null ? `$${row.pnl_usdt}` : '—'}
          </span>
          {row.closed_at && <span className="text-ae-mid">{row.closed_at}</span>}
        </div>
      )}
      {open && (
        <button
          type="button"
          className="mt-3 w-full rounded border border-ae-red/40 py-2 text-ae-red hover:bg-ae-red/10"
          onClick={() => onClose?.(row)}
        >
          MARK CLOSED
        </button>
      )}
    </div>
  )
}
