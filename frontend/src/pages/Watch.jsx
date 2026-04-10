import { useCallback, useEffect, useState } from 'react'
import { apiGet } from '../api'
import { Chart } from '../components/Chart'
import { AddPairModal } from '../components/AddPairModal'
import { PairRow } from '../components/PairRow'
import { FOLD_BREAKPOINT, TIMEFRAMES } from '../constants'
import { useStore } from '../store/useStore'

export function Watch() {
  const pairs = useStore((s) => s.pairs)
  const setPairs = useStore((s) => s.setPairs)
  const prices = useStore((s) => s.prices)
  const stats = useStore((s) => s.stats)
  const setStats = useStore((s) => s.setStats)
  const activePair = useStore((s) => s.activePair)
  const setActivePair = useStore((s) => s.setActivePair)
  const activeTF = useStore((s) => s.activeTF)
  const setActiveTF = useStore((s) => s.setActiveTF)
  const setCandles = useStore((s) => s.setCandles)
  const signals = useStore((s) => s.signals)
  const openSetups = useStore((s) => s.setups.filter((x) => x.status === 'open'))
  const showAdd = useStore((s) => s.showAddPair)
  const setShowAddPair = useStore((s) => s.setShowAddPair)

  const [wide, setWide] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= FOLD_BREAKPOINT : false,
  )
  const [spark, setSpark] = useState({})

  useEffect(() => {
    const onR = () => setWide(window.innerWidth >= FOLD_BREAKPOINT)
    window.addEventListener('resize', onR)
    return () => window.removeEventListener('resize', onR)
  }, [])

  const refreshPairs = useCallback(async () => {
    const list = await apiGet('/api/pairs/')
    setPairs(list)
    const ap = useStore.getState().activePair
    if (!ap && list[0]) setActivePair(list[0].symbol)
  }, [setPairs, setActivePair])

  useEffect(() => {
    refreshPairs().catch(() => {})
  }, [refreshPairs])

  useEffect(() => {
    pairs.forEach((p) => {
      apiGet(`/api/pairs/${encodeURIComponent(p.symbol)}/stats`)
        .then((st) => setStats(p.symbol, st))
        .catch(() => {})
    })
  }, [pairs, setStats])

  useEffect(() => {
    if (!activePair) return
    let cancelled = false
    ;(async () => {
      const d = await apiGet(
        `/api/pairs/${encodeURIComponent(activePair)}/candles?tf=${activeTF}&limit=200`,
      )
      if (!cancelled) setCandles(activePair, activeTF, d.candles || [])
    })().catch(() => {})
    return () => {
      cancelled = true
    }
  }, [activePair, activeTF, setCandles])

  useEffect(() => {
    if (!activePair) return
    let cancelled = false
    ;(async () => {
      const d = await apiGet(
        `/api/pairs/${encodeURIComponent(activePair)}/candles?tf=15m&limit=48`,
      )
      if (cancelled) return
      const closes = (d.candles || []).map((c) => c.close)
      setSpark((s) => ({ ...s, [activePair]: closes }))
    })().catch(() => {})
    return () => {
      cancelled = true
    }
  }, [activePair, pairs])

  const sigFor = (sym) => signals.find((x) => x.pair === sym)
  const tradeFor = (sym) => openSetups.find((x) => x.pair === sym)

  const list = (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between px-1">
        <span className="font-display text-sm font-bold text-ae-mid">WATCHLIST</span>
        <button
          type="button"
          className="rounded border border-ae-border px-2 py-1 font-mono text-[10px] text-ae-green"
          onClick={() => setShowAddPair(true)}
        >
          + Add
        </button>
      </div>
      {pairs.map((p) => {
        const sg = sigFor(p.symbol)
        const tr = tradeFor(p.symbol)
        const badge = tr ? 'trade' : sg ? 'signal' : null
        return (
          <PairRow
            key={p.symbol}
            pair={p}
            price={prices[p.symbol]}
            stats={stats[p.symbol]}
            spark={spark[p.symbol]}
            badge={badge}
            selected={activePair === p.symbol}
            onSelect={(sym) => setActivePair(sym)}
          />
        )
      })}
    </div>
  )

  const chartHeader = (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
      <div className="font-display text-lg font-extrabold">
        {activePair ? activePair.replace('USDT', '/USDT') : '—'}
      </div>
      <div className="flex gap-1">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf}
            type="button"
            onClick={() => setActiveTF(tf)}
            className={`rounded border px-2 py-1 font-mono text-[10px] ${
              activeTF === tf
                ? 'border-ae-green/50 bg-ae-green/10 text-ae-green'
                : 'border-ae-border text-ae-mid'
            }`}
          >
            {tf}
          </button>
        ))}
      </div>
    </div>
  )

  const chartBlock = (
    <div className="flex min-h-[360px] flex-1 flex-col rounded border border-ae-border bg-ae-card p-2">
      {chartHeader}
      <div className="min-h-[320px] flex-1">
        <Chart pair={activePair} tf={activeTF} />
      </div>
    </div>
  )

  return (
    <div className={wide ? 'flex h-full gap-2' : 'flex flex-col gap-2'}>
      <div className={wide ? 'w-[35%] min-w-[200px] overflow-auto' : 'w-full'}>{list}</div>
      <div className={wide ? 'flex w-[65%] flex-1 flex-col' : 'flex w-full flex-col'}>
        {chartBlock}
      </div>
      <AddPairModal open={showAdd} onClose={() => setShowAddPair(false)} />
    </div>
  )
}
