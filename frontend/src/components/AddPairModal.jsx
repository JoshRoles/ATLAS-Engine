import { useEffect, useMemo, useState } from 'react'
import { apiGet, apiSend } from '../api'
import { useStore } from '../store/useStore'

export function AddPairModal({ open, onClose }) {
  const [available, setAvailable] = useState([])
  const setPairs = useStore((s) => s.setPairs)

  useEffect(() => {
    if (!open) return
    apiGet('/api/pairs/available')
      .then((d) => setAvailable(d.symbols || []))
      .catch(() => setAvailable([]))
  }, [open])

  const pairs = useStore((s) => s.pairs)
  const watched = useMemo(() => new Set(pairs.map((p) => p.symbol)), [pairs])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" role="dialog">
      <div className="animate-in slide-in-from-bottom max-h-[70vh] w-full max-w-lg overflow-auto rounded-t-lg border border-ae-border bg-ae-panel p-3 safe-pb">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-display text-lg font-extrabold">Add pair</span>
          <button type="button" className="text-ae-mid" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {available.map((sym) => {
            const on = watched.has(sym)
            return (
              <button
                key={sym}
                type="button"
                disabled={on}
                onClick={async () => {
                  await apiSend('/api/pairs/', 'POST', { symbol: sym })
                  const list = await apiGet('/api/pairs/')
                  setPairs(list)
                  onClose()
                }}
                className={`rounded border px-2 py-2 font-mono text-xs ${
                  on
                    ? 'cursor-not-allowed border-ae-border text-ae-dim'
                    : 'border-ae-borderHi bg-ae-card hover:border-ae-green/50'
                }`}
              >
                {sym.replace('USDT', '/USDT')}
                {on && ' ✓'}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
