import { apiBase } from './constants'

export async function apiGet(path) {
  const r = await fetch(`${apiBase()}${path}`)
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function apiSend(path, method, body) {
  const r = await fetch(`${apiBase()}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body != null ? JSON.stringify(body) : undefined,
  })
  if (!r.ok) throw new Error(await r.text())
  if (r.status === 204) return null
  const t = await r.text()
  return t ? JSON.parse(t) : null
}
