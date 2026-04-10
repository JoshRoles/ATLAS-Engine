import { useEffect, useState } from 'react'
import { apiGet } from '../api'
import { PositionCard } from '../components/PositionCard'
import { useStore } from '../store/useStore'

export function Positions() {
  const positions = useStore((s) => s.positions)
  const setPositions = useStore((s) => s.setPositions)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    apiGet('/api/positions/history')
      .then((rows) => setPositions(rows))
      .catch(() => setPositions([]))
    apiGet('/api/positions/stats')
      .then(setStats)
      .catch(() => setStats(null))
  }, [setPositions])

  return (
    <div className="flex flex-col gap-3">
      <div className="font-display text-xl font-extrabold">History</div>
      {stats && (
        <div className="grid grid-cols-2 gap-2 font-mono text-[11px] md:grid-cols-4">
          <div className="rounded border border-ae-border bg-ae-card p-2">
            <div className="text-ae-dim">TRADES</div>
            <div className="text-lg text-ae-text">{stats.total_trades}</div>
          </div>
          <div className="rounded border border-ae-border bg-ae-card p-2">
            <div className="text-ae-dim">WIN RATE</div>
            <div className="text-lg text-ae-text">{stats.win_rate}%</div>
          </div>
          <div className="rounded border border-ae-border bg-ae-card p-2">
            <div className="text-ae-dim">TOTAL P&amp;L</div>
            <div className="text-lg text-ae-text">${stats.total_pnl}</div>
          </div>
          <div className="rounded border border-ae-border bg-ae-card p-2">
            <div className="text-ae-dim">BEST %</div>
            <div className="text-lg text-ae-text">{stats.best_trade_pct}%</div>
          </div>
        </div>
      )}
      {positions.map((row) => (
        <PositionCard key={row.id} row={row} open={false} />
      ))}
      {!positions.length && (
        <div className="font-mono text-sm text-ae-mid">No closed trades yet.</div>
      )}
    </div>
  )
}
