import { useStore } from '../store/useStore'

const tabs = [
  { id: 'watch', label: 'Watch' },
  { id: 'signals', label: 'Signals' },
  { id: 'setups', label: 'Active' },
  { id: 'history', label: 'History' },
]

export function NavBar() {
  const activeTab = useStore((s) => s.activeTab)
  const setActiveTab = useStore((s) => s.setActiveTab)
  const n = useStore((s) => s.newSignalCount)

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-ae-border bg-ae-panel/95 safe-pb backdrop-blur md:hidden">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => {
            setActiveTab(t.id)
            if (t.id === 'signals') useStore.getState().clearNewSignals()
          }}
          className={`relative flex flex-1 flex-col items-center py-2 text-[10px] font-mono ${
            activeTab === t.id ? 'text-ae-green' : 'text-ae-mid'
          }`}
        >
          {t.label}
          {t.id === 'signals' && n > 0 && (
            <span className="absolute right-3 top-1 h-2 w-2 rounded-full bg-ae-red" />
          )}
        </button>
      ))}
    </nav>
  )
}
