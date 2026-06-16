import { getGoogleToken } from './google-auth.mts'
import type { Context, Config } from "@netlify/functions"

export default async (req: Request, context: Context) => {
  try {
    const gmailAccessToken = await getGoogleToken().catch(() => '')

    if (!gmailAccessToken) {
      console.warn('GMAIL_ACCESS_TOKEN not configured. Using sample data.')
      return new Response(JSON.stringify({
        emails: [
          { prospect: 'Fed Benefits Inc', subject: 'FIA performance report ready', status: 'ready_to_send', days_ago: 0 },
          { prospect: 'FERS Specialist LLC', subject: 'TSP rollover & LEO benefits', status: 'waiting_reply', days_ago: 2 },
          { prospect: 'Treasury Employee CU', subject: 'FEHB 5-yr rule compliance', status: 'new', days_ago: 0 }
        ]
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // Search for recent prospect emails
    const queries = [
      'label:PROSPECT is:unread',
      'label:PROSPECT is:starred',
      'label:PROSPECT newer_than:7d'
    ]

    const threads = new Map()

    for (const query of queries) {
      const searchUrl = `https://gmail.googleapis.com/gmail/v1/users/me/threads?q=${encodeURIComponent(query)}&maxResults=10`

      const searchResponse = await fetch(searchUrl, {
        headers: {
          Authorization: `Bearer ${gmailAccessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!searchResponse.ok) {
        console.warn(`Gmail search error: ${searchResponse.status}`)
        continue
      }

      const searchData = await searchResponse.json()

      for (const thread of searchData.threads || []) {
        if (threads.has(thread.id)) continue

        const threadUrl = `https://gmail.googleapis.com/gmail/v1/users/me/threads/${thread.id}`

        const threadResponse = await fetch(threadUrl, {
          headers: {
            Authorization: `Bearer ${gmailAccessToken}`,
            'Content-Type': 'application/json'
          }
        })

        if (!threadResponse.ok) continue

        const threadData = await threadResponse.json()
        const messages = threadData.messages || []
        if (messages.length === 0) continue

        const lastMessage = messages[messages.length - 1]
        const subject = lastMessage.payload.headers.find((h: any) => h.name === 'Subject')?.value || 'No subject'
        const from = lastMessage.payload.headers.find((h: any) => h.name === 'From')?.value || ''

        // Determine status
        let status: 'new' | 'ready_to_send' | 'waiting_reply' = 'waiting_reply'
        const labels = lastMessage.labelIds || []

        if (labels.includes('UNREAD')) {
          status = 'new'
        } else if (subject.toLowerCase().includes('ready') || subject.toLowerCase().includes('complete')) {
          status = 'ready_to_send'
        }

        // Extract prospect name
        const match = from.match(/([^<]+)</)
        const prospect = match ? match[1].trim() : from.split('@')[0]

        // Calculate days ago
        const timestamp = parseInt(lastMessage.internalDate)
        const daysAgo = Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24))

        threads.set(thread.id, {
          prospect,
          subject: subject.substring(0, 60),
          status,
          days_ago: daysAgo,
          threadId: thread.id
        })
      }
    }

    // Return top 5 most recent
    const emails = Array.from(threads.values())
      .sort((a: any, b: any) => a.days_ago - b.days_ago)
      .slice(0, 5)

    return new Response(JSON.stringify({ emails }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })
  } catch (error) {
    console.error('Gmail function error:', error)
    return new Response(JSON.stringify({
      error: 'Failed to fetch emails',
      emails: []
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    })
  }
}

export const config: Config = {
  path: '/api/gmail-threads'
}
