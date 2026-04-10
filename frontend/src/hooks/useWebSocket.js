import { useEffect, useRef } from 'react'
import { useStore } from '../store/useStore'
import { wsUrl } from '../constants'

function backoff(attempt) {
  return Math.min(30000, 1000 * 2 ** Math.min(attempt, 5))
}

export function useWebSocket() {
  const wsRef = useRef(null)
  const attemptRef = useRef(0)
  const pingRef = useRef(null)

  useEffect(() => {
    let stopped = false

    const connect = () => {
      if (stopped) return
      const url = wsUrl()
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        attemptRef.current = 0
        useStore.getState().setWsConnected(true)
        pingRef.current = window.setInterval(() => {
          try {
            if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }))
          } catch {
            /* ignore */
          }
        }, 20000)
      }

      ws.onmessage = (ev) => {
        let msg
        try {
          msg = JSON.parse(ev.data)
        } catch {
          return
        }
        if (msg.type === 'pong') return
        const st = useStore.getState()

        if (msg.type === 'candle' && msg.pair && msg.tf && msg.candle) {
          st.appendCandle(msg.pair, msg.tf, msg.candle)
        }
        if (msg.type === 'price' && msg.pair != null && msg.price != null) {
          st.setPrice(msg.pair, msg.price)
        }
        if (msg.type === 'signal' && msg.data) {
          st.addSignal(msg.data)
        }
        if (msg.type === 'alert') {
          st.addAlert(msg)
        }
        if (msg.type === 'structure' && msg.pair && msg.tf) {
          st.setStructure(msg.pair, msg.tf, { lines: msg.lines || [] })
        }
      }

      ws.onclose = () => {
        useStore.getState().setWsConnected(false)
        if (pingRef.current) {
          clearInterval(pingRef.current)
          pingRef.current = null
        }
        if (stopped) return
        const ms = backoff(attemptRef.current++)
        window.setTimeout(connect, ms)
      }

      ws.onerror = () => {
        /* onclose handles reconnect */
      }
    }

    connect()

    return () => {
      stopped = true
      if (pingRef.current) clearInterval(pingRef.current)
      try {
        wsRef.current?.close()
      } catch {
        /* ignore */
      }
    }
  }, [])
}
