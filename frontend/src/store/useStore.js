import { create } from 'zustand'

const cacheKey = (pair, tf) => `${pair}_${tf}`

export const useStore = create((set, get) => ({
  pairs: [],
  setPairs: (pairs) => set({ pairs }),

  prices: {},
  setPrice: (pair, price) =>
    set((s) => ({ prices: { ...s.prices, [pair]: price } })),

  stats: {},
  setStats: (pair, st) =>
    set((s) => ({ stats: { ...s.stats, [pair]: st } })),

  candles: {},
  setCandles: (pair, tf, rows) =>
    set((s) => ({
      candles: { ...s.candles, [cacheKey(pair, tf)]: rows },
    })),
  appendCandle: (pair, tf, candle) =>
    set((s) => {
      const k = cacheKey(pair, tf)
      const prev = s.candles[k] ? [...s.candles[k]] : []
      if (!prev.length) prev.push(candle)
      else if (prev[prev.length - 1].time === candle.time) prev[prev.length - 1] = candle
      else prev.push(candle)
      const cap = 500
      if (prev.length > cap) prev.splice(0, prev.length - cap)
      return { candles: { ...s.candles, [k]: prev } }
    }),

  structure: {},
  setStructure: (pair, tf, data) =>
    set((s) => ({
      structure: { ...s.structure, [cacheKey(pair, tf)]: data },
    })),

  activePair: null,
  activeTF: '15m',
  setActivePair: (p) => set({ activePair: p }),
  setActiveTF: (tf) => set({ activeTF: tf }),

  signals: [],
  setSignals: (signals) => set({ signals }),
  addSignal: (sig) =>
    set((s) => {
      const exists = s.signals.some((x) => x.id === sig.id)
      return {
        signals: [sig, ...s.signals.filter((x) => x.id !== sig.id)],
        newSignalCount: exists ? s.newSignalCount : s.newSignalCount + 1,
      }
    }),
  newSignalCount: 0,
  clearNewSignals: () => set({ newSignalCount: 0 }),
  incNewSignals: () => set((s) => ({ newSignalCount: s.newSignalCount + 1 })),

  setups: [],
  setSetups: (setups) => set({ setups }),
  addSetup: (su) => set((s) => ({ setups: [su, ...s.setups] })),
  updateSetup: (id, patch) =>
    set((s) => ({
      setups: s.setups.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    })),

  positions: [],
  setPositions: (positions) => set({ positions }),

  alerts: [],
  addAlert: (a) => set((s) => ({ alerts: [a, ...s.alerts].slice(0, 50) })),
  clearAlert: (positionId) =>
    set((s) => ({
      alerts: s.alerts.filter((a) => a.position_id !== positionId),
    })),

  wsConnected: false,
  setWsConnected: (v) => set({ wsConnected: v }),

  activeTab: 'watch',
  setActiveTab: (t) => set({ activeTab: t }),

  showAddPair: false,
  setShowAddPair: (v) => set({ showAddPair: v }),

  confirmSignal: null,
  setConfirmSignal: (sig) => set({ confirmSignal: sig }),

  reset: () =>
    set({
      pairs: [],
      prices: {},
      stats: {},
      candles: {},
      structure: {},
      signals: [],
      setups: [],
      positions: [],
      alerts: [],
      newSignalCount: 0,
    }),
}))
