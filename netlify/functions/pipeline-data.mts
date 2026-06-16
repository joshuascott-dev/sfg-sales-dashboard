import { getGoogleToken } from './google-auth.mts'
import type { Context, Config } from "@netlify/functions"

/**
 * Appointment activity derived entirely from Google Calendar.
 *
 * No dollar/revenue figures (no CRM/EngageBay integration) — instead this
 * returns pure appointment-count analytics that are honest and verifiable:
 *
 *   For each appointment type:
 *     - count this month
 *     - count last month
 *     - average monthly count across completed months this year (YTD)
 *
 * Appointment types are classified from the event title/description.
 */

const TYPES = ['Initial Consult', 'Performance Report', 'Follow Up', 'Account Setup'] as const
type ApptType = typeof TYPES[number]

function classify(text: string): ApptType | null {
  if (/account setup|paperwork|onboarding|ira setup|ira application|\bira\b.*\bsetup\b|\bfia\b.*\bira\b/.test(text)) return 'Account Setup'
  if (/fia performance report|performance report|\bprc\b/.test(text)) return 'Performance Report'
  if (/follow[\s-]?up|\bpmp\b/.test(text)) return 'Follow Up'
  if (/initial consult|federal benefit|benefits consult|phone consult|\bic\b|discovery/.test(text)) return 'Initial Consult'
  return null
}

export default async (req: Request, context: Context) => {
  try {
    const calendarId = Netlify.env.get('GOOGLE_CALENDAR_ID') || 'primary'
    let token: string
    try { token = await getGoogleToken() } catch {
      return new Response(JSON.stringify({ pipeline: null, error: 'no_token' }), {
        headers: { 'Content-Type': 'application/json' }, status: 200 })
    }

    const now = new Date()
    const yearStart = new Date(now.getFullYear(), 0, 1)
    const timeMin = yearStart.toISOString()
    const timeMax = now.toISOString()

    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?` +
      `timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}` +
      `&singleEvents=true&orderBy=startTime&maxResults=2500`

    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) {
      console.warn(`calendar fetch failed: ${res.status}`)
      return new Response(JSON.stringify({ pipeline: null, error: `calendar_${res.status}` }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      })
    }

    const data = await res.json()
    const events = (data.items || []) as any[]

    const thisMonthIdx = now.getMonth() // 0-11
    const lastMonthIdx = thisMonthIdx - 1 // -1 if January

    // counts[type] = array of 12 monthly counts
    const counts: Record<ApptType, number[]> = {
      'Initial Consult': new Array(12).fill(0),
      'Performance Report': new Array(12).fill(0),
      'Follow Up': new Array(12).fill(0),
      'Account Setup': new Array(12).fill(0)
    }

    for (const ev of events) {
      const text = ((ev.summary || '') + ' ' + (ev.description || '')).toLowerCase()
      if (!text.trim()) continue
      const type = classify(text)
      if (!type) continue
      const startRaw = ev.start?.dateTime || ev.start?.date
      if (!startRaw) continue
      const m = new Date(startRaw).getMonth()
      if (m >= 0 && m < 12) counts[type][m]++
    }

    const appts = TYPES.map((type) => {
      const arr = counts[type]
      const thisMonth = arr[thisMonthIdx]
      const lastMonth = lastMonthIdx >= 0 ? arr[lastMonthIdx] : 0

      // Average across COMPLETED months (Jan .. previous month)
      let completedTotal = 0
      for (let i = 0; i < thisMonthIdx; i++) completedTotal += arr[i]
      const avgMonthly = thisMonthIdx > 0
        ? Number((completedTotal / thisMonthIdx).toFixed(1))
        : thisMonth

      let ytdTotal = 0
      for (let i = 0; i <= thisMonthIdx; i++) ytdTotal += arr[i]

      return { label: type, thisMonth, lastMonth, avgMonthly, ytdTotal }
    })

    const totalThisMonth = appts.reduce((a, t) => a + t.thisMonth, 0)
    const totalLastMonth = appts.reduce((a, t) => a + t.lastMonth, 0)

    let totalCompleted = 0
    for (let i = 0; i < thisMonthIdx; i++) {
      totalCompleted += appts.reduce((a, t) => a + counts[t.label as ApptType][i], 0)
    }
    const totalAvgMonthly = thisMonthIdx > 0
      ? Number((totalCompleted / thisMonthIdx).toFixed(1))
      : totalThisMonth

    const busiest = appts.slice().sort((a, b) => b.thisMonth - a.thisMonth)[0]

    const monthLabel = now.toLocaleString('en-US', { month: 'long' })
    const lastMonthLabel = new Date(now.getFullYear(), thisMonthIdx - 1, 1)
      .toLocaleString('en-US', { month: 'long' })

    return new Response(JSON.stringify({
      pipeline: {
        appts,
        total_this_month: totalThisMonth,
        total_last_month: totalLastMonth,
        total_avg_monthly: totalAvgMonthly,
        busiest_type: busiest && busiest.thisMonth > 0 ? busiest.label : null,
        month_label: monthLabel,
        last_month_label: lastMonthLabel
      },
      meta: {
        source: 'calendar',
        event_count: events.length,
        months_completed: thisMonthIdx
      }
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300'
      },
      status: 200
    })
  } catch (error) {
    console.error('Pipeline function error:', error)
    return new Response(JSON.stringify({ pipeline: null, error: String(error) }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })
  }
}

export const config: Config = {
  path: '/api/pipeline-data'
}
