import { getGoogleToken } from './google-auth.mts'
import type { Context, Config } from "@netlify/functions"

/**
 * Reads tasks from the user's default Google Tasks list.
 * This is the same list that appears in Google Calendar's "Tasks" view,
 * so anything added here shows up on the phone, Gmail, and Calendar.
 *
 * Requires the GOOGLE_ACCESS_TOKEN / GMAIL_ACCESS_TOKEN to carry the
 * https://www.googleapis.com/auth/tasks scope.
 */

export default async (req: Request, context: Context) => {
  try {
    let token: string
    try { token = await getGoogleToken() } catch {
      return json({ tasks: [], error: 'no_token' })
    }

    const url =
      'https://tasks.googleapis.com/tasks/v1/lists/@default/tasks' +
      '?showCompleted=true&showHidden=false&maxResults=100'

    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) {
      return json({ tasks: [], error: `tasks_${res.status}` })
    }

    const data = await res.json()
    const tasks = (data.items || []).map((t: any) => ({
      id: t.id,
      title: t.title || '(untitled)',
      notes: t.notes || '',
      due: t.due || null,
      status: t.status as 'needsAction' | 'completed',
      updated: t.updated || null
    }))

    // Active first (by due date, then untimed), completed last
    tasks.sort((a: any, b: any) => {
      if (a.status !== b.status) return a.status === 'needsAction' ? -1 : 1
      if (a.due && b.due) return a.due.localeCompare(b.due)
      if (a.due) return -1
      if (b.due) return 1
      return 0
    })

    return json({ tasks })
  } catch (error) {
    console.error('tasks-list error:', error)
    return json({ tasks: [], error: String(error) })
  }
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    status
  })
}

export const config: Config = {
  path: '/api/tasks-list'
}
