import { useEffect, useRef } from 'react'
import { apiGet } from './api'
import { Layout } from './components/Layout'
import { useNotifications } from './hooks/useNotifications'
import { useWebSocket } from './hooks/useWebSocket'
import { ActiveSetups } from './pages/ActiveSetups'
import { Positions } from './pages/Positions'
import { Signals } from './pages/Signals'
import { Watch } from './pages/Watch'
import { useStore } from './store/useStore'

export default function App() {
  useWebSocket()
  const { permission, requestPermission, notify } = useNotifications()
  const activeTab = useStore((s) => s.activeTab)
  const signals = useStore((s) => s.signals)
  const prevTop = useRef(null)

  useEffect(() => {
    requestPermission().catch(() => {})
  }, [requestPermission])

  useEffect(() => {
    ;(async () => {
      try {
        const [pairs, sigs, act, hist] = await Promise.all([
          apiGet('/api/pairs/'),
          apiGet('/api/signals/'),
          apiGet('/api/positions/active'),
          apiGet('/api/positions/history'),
        ])
        useStore.getState().setPairs(pairs)
        useStore.getState().setSignals(sigs)
        useStore.getState().setSetups(act)
        useStore.getState().setPositions(hist)
        const ap = useStore.getState().activePair
        if (!ap && pairs[0]) useStore.getState().setActivePair(pairs[0].symbol)
        prevTop.current = sigs[0]?.id ?? null
      } catch {
        /* offline */
      }
    })()
  }, [])

  useEffect(() => {
    const id = signals[0]?.id
    if (!id || permission !== 'granted') return
    if (prevTop.current === null) {
      prevTop.current = id
      return
    }
    if (prevTop.current !== id) {
      const s = signals[0]
      notify('Atlas Engine — new signal', { body: `${s?.pair} ${s?.direction}` })
      prevTop.current = id
    }
  }, [signals, permission, notify])

  let body = <Watch />
  if (activeTab === 'signals') body = <Signals />
  if (activeTab === 'setups') body = <ActiveSetups />
  if (activeTab === 'history') body = <Positions />

  return <Layout>{body}</Layout>
}
