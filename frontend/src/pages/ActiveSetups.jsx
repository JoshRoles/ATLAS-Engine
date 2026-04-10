import { useEffect, useState } from 'react'
import { apiGet, apiSend } from '../api'
import { ConfirmEntryModal } from '../components/ConfirmEntryModal'
import { PositionCard } from '../components/PositionCard'
import { useStore } from '../store/useStore'

export function ActiveSetups() {
  const setups = useStore((s) => s.setups)
  const setSetups = useStore((s) => s.setSetups)
  const confirmSignal = useStore((s) => s.confirmSignal)
  const setConfirmSignal = useStore((s) => s.setConfirmSignal)
  const alerts = useStore((s) => s.alerts)
  const [modal, setModal] = useState(false)
  const [exitFor, setExitFor] = useState(null)
  const [exitPrice, setExitPrice] = useState('')

  useEffect(() => {
    apiGet('/api/positions/active')
      .then((rows) => setSetups(rows))
      .catch(() => setSetups([]))
  }, [setSetups])

  useEffect(() => {
    if (confirmSignal) setModal(true)
  }, [confirmSignal])

  const openRows = setups.filter((x) => x.status === 'open')

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="font-display text-xl font-extrabold">Active setups</div>
        <button
          type="button"
          className="rounded border border-ae-border px-2 py-1 font-mono text-[10px] text-ae-green"
          onClick={() => {
            setConfirmSignal(null)
            setModal(true)
          }}
        >
          + Manual entry
        </button>
      </div>

      {openRows.map((row) => {
        const ban = alerts.find((a) => a.position_id === row.id)
        return (
          <div key={row.id}>
            {ban && (
              <div className="mb-1 rounded border border-ae-amber/40 bg-ae-amber/10 px-2 py-2 font-mono text-[11px] text-ae-amber">
                {ban.message}
              </div>
            )}
            <PositionCard
              row={row}
              open
              onClose={() => {
                setExitFor(row)
                setExitPrice(row.current_price != null ? String(row.current_price) : '')
              }}
            />
          </div>
        )
      })}

      {!openRows.length && (
        <div className="font-mono text-sm text-ae-mid">No open setups.</div>
      )}

      <ConfirmEntryModal
        open={modal}
        signal={confirmSignal || undefined}
        onClose={() => {
          setModal(false)
          setConfirmSignal(null)
        }}
        onSaved={() => apiGet('/api/positions/active').then(setSetups)}
      />

      {exitFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3">
          <div className="w-full max-w-sm rounded border border-ae-border bg-ae-panel p-4 font-mono text-sm">
            <div className="font-display text-lg font-bold">Exit price</div>
            <input
              className="mt-2 w-full rounded border border-ae-border bg-ae-bg px-2 py-2"
              value={exitPrice}
              onChange={(e) => setExitPrice(e.target.value)}
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="flex-1 rounded border border-ae-border py-2"
                onClick={() => setExitFor(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flex-1 rounded bg-ae-red/20 py-2 text-ae-red"
                onClick={async () => {
                  const p = parseFloat(exitPrice)
                  if (!Number.isFinite(p)) return
                  await apiSend(`/api/positions/${exitFor.id}/close`, 'POST', { exit_price: p })
                  const rows = await apiGet('/api/positions/active')
                  setSetups(rows)
                  setExitFor(null)
                }}
              >
                Close trade
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
