import { getGoogleToken } from './google-auth.mts'
import type { Context, Config } from "@netlify/functions"

export default async (req: Request, context: Context) => {
  try {
    const googleCalendarId = Netlify.env.get('GOOGLE_CALENDAR_ID') || 'primary'
    let googleAccessToken: string | null = null
    try { googleAccessToken = await getGoogleToken() } catch {}
    const googleCalendarApiKey = Netlify.env.get('GOOGLE_CALENDAR_API_KEY')

    if (!googleAccessToken && !googleCalendarApiKey) {
      console.warn('GOOGLE_CALENDAR_API_KEY not configured. Using sample data.')
      return new Response(JSON.stringify({
        events: [
          { time: '10:00 AM', type: 'FIA Performance Report', prospect: 'Smith Federal Employees', stage: 'PRC', priority: true },
          { time: '2:30 PM', type: 'Initial Consult', prospect: 'Johnson Family Rollover', stage: 'Initial Consult', priority: false },
          { time: '4:00 PM', type: 'Follow-up A/B', prospect: 'Davis TSP Question', stage: 'Follow Up', priority: true }
        ]
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // Get today's date range
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfDay = new Date(startOfDay)
    endOfDay.setDate(endOfDay.getDate() + 1)

    const timeMin = startOfDay.toISOString()
    const timeMax = endOfDay.toISOString()

    const baseUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(googleCalendarId)}/events?timeMin=${timeMin}&timeMax=${timeMax}&orderBy=startTime&singleEvents=true`
    // Prefer OAuth token (works with private calendars); fall back to API key (public calendars only)
    const calendarUrl = googleAccessToken ? baseUrl : `${baseUrl}&key=${googleCalendarApiKey}`
    const fetchOpts = googleAccessToken ? { headers: { Authorization: `Bearer ${googleAccessToken}` } } : undefined

    const calendarResponse = await fetch(calendarUrl, fetchOpts)

    if (!calendarResponse.ok) {
      throw new Error(`Calendar API error: ${calendarResponse.status}`)
    }

    const calendarData = await calendarResponse.json()

    // Parse events
    const events = (calendarData.items || [])
      .filter((event: any) => event.start && event.summary)
      .map((event: any) => {
        const startTime = new Date(event.start.dateTime || event.start.date)
        const timeStr = startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

        // Determine event type and priority
        const summary = event.summary.toLowerCase()
        let eventType = 'Meeting'
        let priority = false

        if (summary.includes('fia') || summary.includes('performance report')) {
          eventType = 'FIA Performance Report'
          priority = true
        } else if (summary.includes('initial consult') || summary.includes('consult')) {
          eventType = 'Initial Consult'
        } else if (summary.includes('follow')) {
          eventType = 'Follow-up'
          priority = true
        }

        // Extract prospect name from description or use event title
        let prospect = event.summary
        if (event.description) {
          const match = event.description.match(/prospect[:\s]+([^\n]+)/i)
          if (match) {
            prospect = match[1].trim()
          }
        }

        return {
          time: timeStr,
          type: eventType,
          prospect: prospect,
          stage: summary.includes('prc') ? 'PRC' : 'Initial Consult',
          priority: priority,
          eventId: event.id
        }
      })

    return new Response(JSON.stringify({ events }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })
  } catch (error) {
    console.error('Calendar function error:', error)
    return new Response(JSON.stringify({
      error: 'Failed to fetch calendar events',
      events: []
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    })
  }
}

export const config: Config = {
  path: '/api/calendar-events'
}
