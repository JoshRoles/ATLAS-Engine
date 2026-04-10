import { useEffect, useState } from 'react'
import { FOLD_BREAKPOINT } from '../constants'
import { useStore } from '../store/useStore'
import { NavBar } from './NavBar'

const tabs = [
  { id: 'watch', label: 'Watch', icon: '◎' },
  { id: 'signals', label: 'Signals', icon: '⚡' },
  { id: 'setups', label: 'Active', icon: '◈' },
  { id: 'history', label: 'History', icon: '▤' },
]

export function Layout({ children }) {
  const [wide, setWide] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= FOLD_BREAKPOINT : false,
  )
  const activeTab = useStore((s) => s.activeTab)
  const setActiveTab = useStore((s) => s.setActiveTab)
  const wsConnected = useStore((s) => s.wsConnected)
  const n = useStore((s) => s.newSignalCount)

  useEffect(() => {
    const onR = () => setWide(window.innerWidth >= FOLD_BREAKPOINT)
    window.addEventListener('resize', onR)
    return () => window.removeEventListener('resize', onR)
  }, [])

  return (
    <div className="flex min-h-full flex-col md:flex-row">
      {wide && (
        <aside className="flex w-16 shrink-0 flex-col border-r border-ae-border bg-ae-panel py-3">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              title={t.label}
              onClick={() => {
                setActiveTab(t.id)
                if (t.id === 'signals') useStore.getState().clearNewSignals()
              }}
              className={`relative mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded border text-lg ${
                activeTab === t.id
                  ? 'border-ae-green/50 bg-ae-green/10 text-ae-green'
                  : 'border-transparent text-ae-mid hover:border-ae-border'
              }`}
            >
              <span className="sr-only">{t.label}</span>
              {t.icon}
              {t.id === 'signals' && n > 0 && (
                <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-ae-red" />
              )}
            </button>
          ))}
        </aside>
      )}
      <div className="flex min-h-full flex-1 flex-col pb-16 md:pb-0">
        <header className="flex items-center justify-between border-b border-ae-border bg-ae-panel px-3 py-2">
          <div className="font-display text-lg font-extrabold tracking-tight">
            Atlas Engine
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px] text-ae-mid">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                wsConnected ? 'bg-ae-green animate-ae-pulse' : 'bg-ae-red'
              }`}
            />
            {wsConnected ? 'LIVE' : 'OFFLINE'}
          </div>
        </header>
        <main className="flex-1 overflow-auto p-3">{children}</main>
      </div>
      {!wide && <NavBar />}
    </div>
  )
}
