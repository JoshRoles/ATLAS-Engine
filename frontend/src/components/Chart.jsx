import { useEffect, useRef } from 'react'
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts'
import { COLORS } from '../constants'
import { useStore } from '../store/useStore'

const EMPTY = []

function emaFromBars(bars, period) {
  if (!bars.length) return []
  const k = 2 / (period + 1)
  let v = bars[0].close
  const out = [{ time: bars[0].time, value: v }]
  for (let i = 1; i < bars.length; i++) {
    v = bars[i].close * k + v * (1 - k)
    out.push({ time: bars[i].time, value: v })
  }
  return out
}

function vwapFromBars(bars) {
  if (!bars.length) return []
  let pv = 0
  let vol = 0
  let currentDay = null
  const out = []
  for (const b of bars) {
    const day = new Date(b.time * 1000).toISOString().slice(0, 10)
    if (day !== currentDay) {
      currentDay = day
      pv = 0
      vol = 0
    }
    const tp = (b.high + b.low + b.close) / 3
    pv += tp * b.volume
    vol += b.volume
    out.push({ time: b.time, value: vol > 0 ? pv / vol : b.close })
  }
  return out
}

function rsiFromBars(bars, period = 14) {
  if (bars.length < period + 1) return []
  const out = []
  for (let i = period; i < bars.length; i++) {
    let gain = 0
    let loss = 0
    for (let j = i - period + 1; j <= i; j++) {
      const ch = bars[j].close - bars[j - 1].close
      if (ch >= 0) gain += ch
      else loss -= ch
    }
    const avgg = gain / period
    const avgl = loss / period
    const rs = avgl === 0 ? 100 : avgg / avgl
    const rsi = 100 - 100 / (1 + rs)
    out.push({ time: bars[i].time, value: rsi })
  }
  return out
}

export function Chart({ pair, tf, emaFast = 9, emaSlow = 21 }) {
  const containerRef = useRef(null)
  const rsiContainerRef = useRef(null)
  const chartRef = useRef(null)
  const rsiChartRef = useRef(null)
  const seriesRef = useRef(null)
  const volRef = useRef(null)
  const ema9Ref = useRef(null)
  const ema21Ref = useRef(null)
  const vwapRef = useRef(null)
  const rsiSeriesRef = useRef(null)
  const priceLineRefs = useRef([])
  const candles = useStore((s) => {
    const k = pair && tf ? `${pair}_${tf}` : ''
    return k ? (s.candles[k] ?? EMPTY) : EMPTY
  })
  const structure = useStore((s) => {
    const k = pair && tf ? `${pair}_${tf}` : ''
    return k ? s.structure[k] : null
  })
  const lastPrice = useStore((s) => (pair ? s.prices[pair] : null))

  const key = `${pair}_${tf}`

  useEffect(() => {
    if (!containerRef.current || !rsiContainerRef.current || !pair) return

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: COLORS.bg },
        textColor: COLORS.text,
      },
      grid: {
        vertLines: { color: COLORS.border },
        horzLines: { color: COLORS.border },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: COLORS.border },
      timeScale: { borderColor: COLORS.border, timeVisible: true, secondsVisible: false },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    })

    const candle = chart.addCandlestickSeries({
      upColor: COLORS.green,
      downColor: COLORS.red,
      borderVisible: false,
      wickUpColor: COLORS.green,
      wickDownColor: COLORS.red,
    })

    const vol = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
      scaleMargins: { top: 0.85, bottom: 0 },
    })
    chart.priceScale('vol').applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    })

    const e9 = chart.addLineSeries({
      color: COLORS.blue,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    })
    const e21 = chart.addLineSeries({
      color: COLORS.amber,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    })
    const vw = chart.addLineSeries({
      color: COLORS.purple,
      lineWidth: 2,
      lineStyle: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    })

    chartRef.current = chart
    seriesRef.current = candle
    volRef.current = vol
    ema9Ref.current = e9
    ema21Ref.current = e21
    vwapRef.current = vw

    const rsiChart = createChart(rsiContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: COLORS.bg },
        textColor: COLORS.text,
      },
      grid: {
        vertLines: { color: COLORS.border },
        horzLines: { color: COLORS.border },
      },
      width: rsiContainerRef.current.clientWidth,
      height: rsiContainerRef.current.clientHeight,
      rightPriceScale: { borderColor: COLORS.border },
      timeScale: { visible: false },
    })
    const rsiSeries = rsiChart.addLineSeries({
      color: COLORS.amber,
      lineWidth: 2,
      priceLineVisible: false,
    })
    rsiChartRef.current = rsiChart
    rsiSeriesRef.current = rsiSeries

    rsiSeries.createPriceLine({ price: 70, color: COLORS.red, lineWidth: 1, lineStyle: 2 })
    rsiSeries.createPriceLine({ price: 50, color: COLORS.mid, lineWidth: 1, lineStyle: 2 })
    rsiSeries.createPriceLine({ price: 30, color: COLORS.green, lineWidth: 1, lineStyle: 2 })

    const ro = new ResizeObserver(() => {
      if (!containerRef.current || !rsiContainerRef.current) return
      chart.applyOptions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      })
      rsiChart.applyOptions({
        width: rsiContainerRef.current.clientWidth,
        height: rsiContainerRef.current.clientHeight,
      })
    })
    ro.observe(containerRef.current)
    ro.observe(rsiContainerRef.current)

    return () => {
      ro.disconnect()
      chart.remove()
      rsiChart.remove()
      chartRef.current = null
      rsiChartRef.current = null
      seriesRef.current = null
      priceLineRefs.current = []
    }
  }, [pair, tf, key])

  useEffect(() => {
    const candle = seriesRef.current
    const vol = volRef.current
    const e9 = ema9Ref.current
    const e21 = ema21Ref.current
    const vw = vwapRef.current
    const rsiS = rsiSeriesRef.current
    if (!candle || !candles.length) return

    const bars = candles.map((c) => ({
      time: c.time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }))

    candle.setData(bars)

    vol.setData(
      candles.map((c) => ({
        time: c.time,
        value: c.volume,
        color:
          c.close >= c.open ? 'rgba(0,229,160,0.25)' : 'rgba(255,61,107,0.25)',
      })),
    )

    e9.setData(emaFromBars(candles, emaFast))
    e21.setData(emaFromBars(candles, emaSlow))
    vw.setData(vwapFromBars(candles))

    const rsiData = rsiFromBars(candles, 14)
    rsiS.setData(rsiData)

    // Current price line on main chart
    priceLineRefs.current.forEach((ln) => {
      try {
        candle.removePriceLine(ln)
      } catch {
        /* ignore */
      }
    })
    priceLineRefs.current = []
    const lp = lastPrice ?? bars[bars.length - 1].close
    const pl = candle.createPriceLine({
      price: lp,
      color: COLORS.amber,
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: '',
    })
    priceLineRefs.current.push(pl)

    // Structure overlays
    const lines = structure?.lines || []
    lines.forEach((ln) => {
      if (ln.kind === 'horizontal' && ln.price != null) {
        const p = candle.createPriceLine({
          price: ln.price,
          color: ln.color || COLORS.green,
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: ln.label || '',
        })
        priceLineRefs.current.push(p)
      }
    })

    chartRef.current?.timeScale().fitContent()
  }, [candles, structure, lastPrice, key, emaFast, emaSlow])

  if (!pair) {
    return (
      <div className="flex h-full min-h-[280px] items-center justify-center font-mono text-sm text-ae-mid">
        Select a pair
      </div>
    )
  }

  return (
    <div className="flex min-h-[320px] flex-1 flex-col gap-1">
      <div ref={containerRef} className="min-h-[240px] w-full flex-1" />
      <div ref={rsiContainerRef} className="h-[72px] w-full shrink-0" />
      <div className="px-1 font-mono text-[10px] text-ae-mid">RSI 14</div>
    </div>
  )
}
