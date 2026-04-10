import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiGet } from '../api'
import { Chart } from '../components/Chart'
import { AddPairModal } from '../components/AddPairModal'
import { PairRow } from '../components/PairRow'
import { DESKTOP_BREAKPOINT, FOLD_BREAKPOINT, TIMEFRAMES } from '../constants'
import { useStore } from '../store/useStore'

function useDeviceMode() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 0)
  useEffect(() => {
    const onR = () => setW(window.innerWidth)
    window.addEventListener('resize', onR)
    return () => window.removeEventListener('resize', onR)
  }, [])
  if (w >= DESKTOP_BREAKPOINT) return 'desktop'
  if (w >= FOLD_BREAKPOINT) return 'fold'
  return 'mobile'
}

export function Watch() {
  const mode = useDeviceMode()
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
  const setups = useStore((s) => s.setups)
  const showAdd = useStore((s) => s.showAddPair)
  const setShowAddPair = useStore((s) => s.setShowAddPair)
  const emaPeriods = useStore((s) => s.emaPeriods)
  const emaColors = useStore((s) => s.emaColors)
  const setEmaPeriodAt = useStore((s) => s.setEmaPeriodAt)
  const setEmaColorAt = useStore((s) => s.setEmaColorAt)

  const [spark, setSpark] = useState({})

  const refreshPairs = useCallback(async () => {
    const list = await apiGet('/api/pairs/')
    setPairs(list)
    const ap = useStore.getState().activePair
    if (!ap && list[0]) setActivePair(list[0].symbol)
  }, [setPairs, setActivePair])

  const loadCandles = useCallback(
    async (symbol, tf) => {
      const d = await apiGet(`/api/pairs/${encodeURIComponent(symbol)}/candles?tf=${tf}&limit=300`)
      setCandles(symbol, tf, d.candles || [])
    },
    [setCandles],
  )

  const refreshStats = useCallback(async () => {
    await Promise.all(
      pairs.map(async (p) => {
        try {
          const st = await apiGet(`/api/pairs/${encodeURIComponent(p.symbol)}/stats`)
          setStats(p.symbol, st)
        } catch {
          /* ignore */
        }
      }),
    )
  }, [pairs, setStats])

  useEffect(() => {
    refreshPairs().catch(() => {})
  }, [refreshPairs])

  useEffect(() => {
    if (!pairs.length) return
    refreshStats().catch(() => {})
    const id = window.setInterval(() => {
      refreshStats().catch(() => {})
    }, 1000)
    return () => window.clearInterval(id)
  }, [pairs, refreshStats])

  useEffect(() => {
    if (!activePair) return
    loadCandles(activePair, activeTF).catch(() => {})
  }, [activePair, activeTF, loadCandles])

  useEffect(() => {
    if (!activePair) return
    const id = window.setInterval(() => {
      loadCandles(activePair, activeTF).catch(() => {})
    }, 1000)
    return () => window.clearInterval(id)
  }, [activePair, activeTF, loadCandles])

  useEffect(() => {
    if (!activePair) return
    let cancelled = false
    ;(async () => {
      const d = await apiGet(
        `/api/pairs/${encodeURIComponent(activePair)}/candles?tf=1m&limit=60`,
      )
      if (cancelled) return
      const closes = (d.candles || []).map((c) => c.close)
      setSpark((s) => ({ ...s, [activePair]: closes }))
    })().catch(() => {})
    return () => {
      cancelled = true
    }
  }, [activePair, pairs])

  const openSetups = useMemo(() => setups.filter((x) => x.status === 'open'), [setups])
  const sigFor = (sym) => signals.find((x) => x.pair === sym)
  const tradeFor = (sym) => openSetups.find((x) => x.pair === sym)

  const list = (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-semibold text-ae-mid">WATCHLIST</span>
        <button
          type="button"
          className="rounded border border-ae-border px-2 py-1 text-[10px] text-ae-green"
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
            price={prices[p.symbol] ?? stats[p.symbol]?.last_price}
            stats={stats[p.symbol]}
            spark={spark[p.symbol]}
            badge={badge}
            selected={activePair === p.symbol}
            onSelect={async (sym) => {
              setActivePair(sym)
              await loadCandles(sym, activeTF)
            }}
          />
        )
      })}
    </div>
  )

  const chartHeader = (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
      <div className="text-lg font-semibold">{activePair ? activePair.replace('USDT', '/USDT') : '—'}</div>
      <div className="flex flex-wrap items-center gap-1">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf}
            type="button"
            onClick={() => setActiveTF(tf)}
            className={`rounded border px-2 py-1 text-[10px] ${
              activeTF === tf
                ? 'border-ae-green/50 bg-ae-green/10 text-ae-green'
                : 'border-ae-border text-ae-mid'
            }`}
          >
            {tf}
          </button>
        ))}
        {[0, 1, 2, 3].map((idx) => (
          <div key={idx} className="flex items-center gap-1">
            <select
              className="rounded border border-ae-border bg-ae-bg px-2 py-1 text-[10px] text-ae-mid"
              value={emaPeriods[idx]}
              onChange={(e) => setEmaPeriodAt(idx, parseInt(e.target.value, 10))}
            >
              {[5, 7, 9, 12, 20, 21, 25, 50, 99, 100, 200].map((v) => (
                <option key={v} value={v}>
                  EMA {v}
                </option>
              ))}
            </select>
            <input
              type="color"
              value={emaColors[idx]}
              onChange={(e) => setEmaColorAt(idx, e.target.value)}
              className="h-6 w-7 rounded border border-ae-border bg-ae-bg p-0"
              title={`EMA ${idx + 1} color`}
            />
          </div>
        ))}
      </div>
    </div>
  )

  const chartBlock = (
    <div className="flex min-h-[420px] flex-1 flex-col rounded border border-ae-border bg-ae-card p-2">
      {chartHeader}
      <div className="min-h-[360px] flex-1">
        <Chart
          pair={activePair}
          tf={activeTF}
          emaConfigs={emaPeriods.map((period, i) => ({ period, color: emaColors[i] }))}
        />
      </div>
    </div>
  )

  const leftWidth = mode === 'desktop' ? 'w-[30%] min-w-[320px]' : mode === 'fold' ? 'w-[35%] min-w-[220px]' : 'w-full'
  const rightWidth = mode === 'desktop' ? 'w-[70%]' : mode === 'fold' ? 'w-[65%]' : 'w-full'

  return (
    <div className={mode === 'mobile' ? 'flex flex-col gap-2' : 'flex h-full gap-2'}>
      <div className={`${leftWidth} overflow-auto`}>{list}</div>
      <div className={`${rightWidth} flex flex-1 flex-col`}>{chartBlock}</div>
      <AddPairModal open={showAdd} onClose={() => setShowAddPair(false)} />
    </div>
  )
}

