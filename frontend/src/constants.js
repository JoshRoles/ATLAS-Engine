export const FOLD_BREAKPOINT = 600
export const DESKTOP_BREAKPOINT = 1100

export const TIMEFRAMES = ['1m', '3m', '5m', '15m', '1h', '4h', '1d']
export const DEFAULT_EMA_PERIODS = [9, 21, 50, 200]
export const DEFAULT_EMA_COLORS = ['#3b9eff', '#f5a623', '#22d3ee', '#a78bfa']
export const TOP_20_PAIRS = [
  'BTCUSDT',
  'ETHUSDT',
  'BNBUSDT',
  'SOLUSDT',
  'XRPUSDT',
  'ADAUSDT',
  'DOGEUSDT',
  'AVAXUSDT',
  'DOTUSDT',
  'MATICUSDT',
  'LINKUSDT',
  'UNIUSDT',
  'ATOMUSDT',
  'LTCUSDT',
  'ETCUSDT',
  'FILUSDT',
  'APTUSDT',
  'ARBUSDT',
  'OPUSDT',
  'NEARUSDT',
]

export const COLORS = {
  bg: '#070a0e',
  panel: '#0c1018',
  card: '#101520',
  border: '#192030',
  green: '#00e5a0',
  red: '#ff3d6b',
  amber: '#f5a623',
  blue: '#3b9eff',
  purple: '#c084fc',
  text: '#dce6f5',
  mid: '#6a7a99',
}

/** API base: empty = same origin (Vite proxy in dev). */
export const apiBase = () => {
  const v = import.meta.env.VITE_API_URL
  if (v) return v.replace(/\/$/, '')
  return ''
}

export const wsUrl = () => {
  const v = import.meta.env.VITE_WS_URL
  if (v) return v
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}/ws`
}
