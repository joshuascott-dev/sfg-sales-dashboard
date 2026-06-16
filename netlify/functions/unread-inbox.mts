import { getGoogleToken } from './google-auth.mts'
import type { Context, Config } from "@netlify/functions"

// Unread inbox summaries for the daily briefing.
// Lists recent unread messages with sender, subject, and snippet.

export default async (req: Request, context: Context) => {
  try {
    let token: string
    try { token = await getGoogleToken() } catch {
      return new Response(JSON.stringify({ unread: [], configured: false }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      })
    }

    const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent('is:unread in:inbox newer_than:3d')}&maxResults=8`
    const listRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (!listRes.ok) {
      console.warn(`Gmail unread list error: ${listRes.status}`)
      return new Response(JSON.stringify({ unread: [], error: `gmail_${listRes.status}` }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      })
    }

    const listData = await listRes.json()
    const ids: string[] = (listData.messages || []).map((m: any) => m.id)

    const unread = (
      await Promise.all(
        ids.map(async (id) => {
          try {
            const msgUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`
            const msgRes = await fetch(msgUrl, {
              headers: { Authorization: `Bearer ${token}` }
            })
            if (!msgRes.ok) return null
            const msg = await msgRes.json()
            const headers = msg.payload?.headers || []
            const get = (n: string) => headers.find((h: any) => h.name === n)?.value || ''

            const fromRaw = get('From')
            const fromMatch = fromRaw.match(/^"?([^"<]+)"?\s*</)
            const from = (fromMatch ? fromMatch[1] : fromRaw.split('@')[0]).trim()

            const ts = parseInt(msg.internalDate || '0')
            const hoursAgo = ts ? Math.max(0, Math.floor((Date.now() - ts) / 3600000)) : null

            return {
              id,
              from: from.substring(0, 40),
              subject: (get('Subject') || '(no subject)').substring(0, 80),
              snippet: (msg.snippet || '').substring(0, 120),
              hoursAgo
            }
          } catch {
            return null
          }
        })
      )
    ).filter(Boolean)

    return new Response(JSON.stringify({ unread, configured: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })
  } catch (error) {
    console.error('Unread inbox function error:', error)
    return new Response(JSON.stringify({ unread: [] }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })
  }
}

export const config: Config = {
  path: '/api/unread-inbox'
}
