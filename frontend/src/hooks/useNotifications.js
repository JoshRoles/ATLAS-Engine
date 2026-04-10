import { useCallback, useEffect, useState } from 'react'

export function useNotifications() {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied',
  )

  useEffect(() => {
    if (typeof Notification === 'undefined') return
    setPermission(Notification.permission)
  }, [])

  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return 'denied'
    const p = await Notification.requestPermission()
    setPermission(p)
    return p
  }, [])

  const notify = useCallback((title, options) => {
    if (typeof Notification === 'undefined') return
    if (Notification.permission !== 'granted') return
    try {
      // eslint-disable-next-line no-new
      new Notification(title, { ...options, silent: false })
    } catch {
      /* ignore */
    }
  }, [])

  return { permission, requestPermission, notify }
}
