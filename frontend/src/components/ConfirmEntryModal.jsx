import { useEffect, useState } from 'react'
import { apiSend } from '../api'
import { useStore } from '../store/useStore'

export function ConfirmEntryModal({ open, signal, onClose, onSaved }) {
  const [pair, setPair] = useState('')
  const [direction, setDirection] = useState('LONG')
  const [entry, setEntry] = useState('')
  const [size, setSize] = useState('')
  const [notes, setNotes] = useState('')
  const addSetup = useStore((s) => s.addSetup)

  useEffect(() => {
    if (signal) {
      setPair(signal.pair || '')
      setDirection(signal.direction || 'LONG')
    } else {
      setPair('')
      setDirection('LONG')
    }
    setEntry('')
    setSize('')
    setNotes('')
  }, [signal, open])

  if (!open) return null

  const submit = async () => {
    const ep = parseFloat(entry)
    const sz = parseFloat(size)
    if (!Number.isFinite(ep) || !Number.isFinite(sz)) return
    const sym = (signal?.pair || pair).toUpperCase().replace('/', '')
    if (!sym) return
    const body = {
      signal_id: signal?.id ?? null,
      pair: sym,
      direction: signal?.direction || direction,
      entry_price: ep,
      position_size_usdt: sz,
      stop_loss: signal?.stop_loss,
      take_profit: signal?.take_profit,
      strategy_name: signal?.strategy_name,
      notes,
    }
    const su = await apiSend('/api/positions/confirm', 'POST', body)
    addSetup(su)
    onSaved?.()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3" role="dialog">
      <div className="w-full max-w-md rounded border border-ae-border bg-ae-panel p-4">
        <div className="font-display text-lg font-extrabold">Confirm entry</div>
        {signal ? (
          <div className="mt-2 font-mono text-xs text-ae-mid">
            {signal.pair} {signal.direction} · SL {signal.stop_loss} · TP {signal.take_profit}
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div>
              <label className="font-mono text-[10px] text-ae-mid">PAIR</label>
              <input
                className="mt-1 w-full rounded border border-ae-border bg-ae-bg px-2 py-2 font-mono text-sm"
                value={pair}
                onChange={(e) => setPair(e.target.value)}
                placeholder="BTCUSDT"
              />
            </div>
            <div>
              <label className="font-mono text-[10px] text-ae-mid">DIR</label>
              <select
                className="mt-1 w-full rounded border border-ae-border bg-ae-bg px-2 py-2 font-mono text-sm"
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
              >
                <option value="LONG">LONG</option>
                <option value="SHORT">SHORT</option>
              </select>
            </div>
          </div>
        )}
        <label className="mt-4 block font-mono text-[10px] text-ae-mid">ACTUAL ENTRY</label>
        <input
          className="mt-1 w-full rounded border border-ae-border bg-ae-bg px-2 py-2 font-mono text-sm"
          value={entry}
          onChange={(e) => setEntry(e.target.value)}
          placeholder="Price"
        />
        <label className="mt-3 block font-mono text-[10px] text-ae-mid">SIZE (USDT)</label>
        <input
          className="mt-1 w-full rounded border border-ae-border bg-ae-bg px-2 py-2 font-mono text-sm"
          value={size}
          onChange={(e) => setSize(e.target.value)}
          placeholder="100"
        />
        <label className="mt-3 block font-mono text-[10px] text-ae-mid">NOTES</label>
        <textarea
          className="mt-1 w-full rounded border border-ae-border bg-ae-bg px-2 py-2 font-mono text-sm"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            className="flex-1 rounded border border-ae-border py-2 text-ae-mid"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="flex-1 rounded bg-ae-green/20 py-2 font-bold text-ae-green"
            onClick={submit}
          >
            CONFIRM
          </button>
        </div>
      </div>
    </div>
  )
}
