import { getGoogleToken } from './google-auth.mts'
import type { Context, Config } from "@netlify/functions"

/**
 * Mutates the user's default Google Tasks list.
 * POST body: { action: 'add'|'toggle'|'delete', ... }
 *   add:    { action:'add', title, notes?, due? (YYYY-MM-DD) }
 *   toggle: { action:'toggle', id, status:'completed'|'needsAction' }
 *   delete: { action:'delete', id }
 *
 * Writes sync straight back to Google Calendar / Gmail / phone.
 */

const BASE = 'https://tasks.googleapis.com/tasks/v1/lists/@default/tasks'

export default async (req: Request, context: Context) => {
  try {
    let token: string
    try { token = await getGoogleToken() } catch { return json({ ok: false, error: 'no_token' }, 200) }

    if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405)

    const body = await req.json().catch(() => ({}))
    const action = body.action
    const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

    if (action === 'add') {
      const title = (body.title || '').toString().trim()
      if (!title) return json({ ok: false, error: 'empty_title' }, 200)
      const payload: Record<string, unknown> = { title }
      if (body.notes) payload.notes = body.notes
      if (body.due) {
        // Google Tasks expects RFC3339; only the date portion is used
        payload.due = `${body.due}T00:00:00.000Z`
      }
      const res = await fetch(BASE, { method: 'POST', headers: auth, body: JSON.stringify(payload) })
      if (!res.ok) return json({ ok: false, error: `add_${res.status}` }, 200)
      const t = await res.json()
      return json({ ok: true, task: shape(t) })
    }

    if (action === 'toggle') {
      const id = body.id
      const status = body.status === 'completed' ? 'completed' : 'needsAction'
      if (!id) return json({ ok: false, error: 'missing_id' }, 200)
      const payload: Record<string, unknown> = { status }
      if (status === 'needsAction') payload.completed = null
      const res = await fetch(`${BASE}/${encodeURIComponent(id)}`, {
        method: 'PATCH', headers: auth, body: JSON.stringify(payload)
      })
      if (!res.ok) return json({ ok: false, error: `toggle_${res.status}` }, 200)
      const t = await res.json()
      return json({ ok: true, task: shape(t) })
    }

    if (action === 'delete') {
      const id = body.id
      if (!id) return json({ ok: false, error: 'missing_id' }, 200)
      const res = await fetch(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE', headers: auth })
      if (!res.ok && res.status !== 204) return json({ ok: false, error: `delete_${res.status}` }, 200)
      return json({ ok: true, id })
    }

    return json({ ok: false, error: 'unknown_action' }, 200)
  } catch (error) {
    console.error('tasks-mutate error:', error)
    return json({ ok: false, error: String(error) }, 200)
  }
}

function shape(t: any) {
  return {
    id: t.id,
    title: t.title || '(untitled)',
    notes: t.notes || '',
    due: t.due || null,
    status: t.status,
    updated: t.updated || null
  }
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    status
  })
}

export const config: Config = {
  path: '/api/tasks-mutate'
}
