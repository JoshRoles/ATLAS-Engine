/** Sparkline from close prices (SVG). */
export function MiniChart({ closes = [], positive }) {
  const w = 96
  const h = 32
  if (!closes.length) {
    return (
      <div
        className="font-mono text-[10px] text-ae-dim"
        style={{ width: w, height: h }}
      >
        —
      </div>
    )
  }
  const min = Math.min(...closes)
  const max = Math.max(...closes)
  const pad = 2
  const pts = closes.map((v, i) => {
    const x = pad + (i / Math.max(1, closes.length - 1)) * (w - pad * 2)
    const y =
      h -
      pad -
      ((v - min) / Math.max(1e-9, max - min)) * (h - pad * 2)
    return `${x},${y}`
  })
  const stroke =
    positive === true ? '#00e5a0' : positive === false ? '#ff3d6b' : '#6a7a99'
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="1.2"
        points={pts.join(' ')}
      />
    </svg>
  )
}
