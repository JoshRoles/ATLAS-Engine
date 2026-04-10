import { useEffect } from 'react'
import { apiGet } from '../api'
import { SignalCard } from '../components/SignalCard'
import { useStore } from '../store/useStore'

export function Signals() {
  const signals = useStore((s) => s.signals)
  const setSignals = useStore((s) => s.setSignals)
  const setActiveTab = useStore((s) => s.setActiveTab)
  const setConfirmSignal = useStore((s) => s.setConfirmSignal)

  useEffect(() => {
    apiGet('/api/signals/')
      .then((rows) => setSignals(rows))
      .catch(() => setSignals([]))
  }, [setSignals])

  const now = Date.now()

  return (
    <div className="flex flex-col gap-2">
      <div className="font-display text-xl font-extrabold">Signals</div>
      {signals.map((s) => {
        const exp = new Date(s.expires_at).getTime()
        const expired = exp <= now
        return (
          <SignalCard
            key={s.id}
            signal={s}
            expired={expired}
            onAct={(sig) => {
              setConfirmSignal(sig)
              setActiveTab('setups')
            }}
          />
        )
      })}
      {!signals.length && (
        <div className="font-mono text-sm text-ae-mid">No active signals.</div>
      )}
    </div>
  )
}
