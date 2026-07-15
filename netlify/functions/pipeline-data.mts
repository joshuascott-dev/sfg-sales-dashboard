import { getGoogleToken } from './google-auth.mts'
import type { Context, Config } from "@netlify/functions"

/**
 * Appointment activity derived entirely from Google Calendar.
 *
 * No dollar/revenue figures (no CRM/EngageBay integration) — instead this
 * returns pure appointment-count analytics that are honest and verifiable.
 *
 * All comparisons are MONTH-TO-DATE, like-for-like:
 *
 *   For each appointment type:
 *     - count this month so far (month-to-date)
 *     - count last month over the SAME elapsed period (day 1 → same day/time)
 *     - count for last month in full (context only)
 *     - average MTD count across completed months this year (pace reference)
 *     - average full-month count across completed months this year
 *
 * Rationale: events are only fetched through `now`, so "this month" is always
 * partial. Comparing that against a COMPLETE prior month made the current month
 * look worse every time, purely as an artifact of the calendar. Each prior month
 * is therefore truncated at the same day-of-month and clock time as today.
 *
 * Short-month guard: if today is the 31st and the prior month has 30 days, the
 * cutoff clamps to the last valid day of that month rather than rolling forward
 * into the next one.
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

const avg1 = (total: number, n: number) => Number((total / n).toFixed(1))

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

    const year = now.getFullYear()
    const thisMonthIdx = now.getMonth()  // 0-11
    const lastMonthIdx = thisMonthIdx - 1 // -1 if January
    const mtdDay = now.getDate()

    // Per-month MTD cutoff: same day-of-month + same clock time as right now,
    // clamped to months shorter than today's day-of-month.
    const daysInMonth = (m: number) => new Date(year, m + 1, 0).getDate()
    const cutoffDayFor = (m: number) => Math.min(mtdDay, daysInMonth(m))
    const cutoffs: Date[] = []
    for (let m = 0; m < 12; m++) {
      const day = cutoffDayFor(m)
      cutoffs[m] = day < mtdDay
        // Month is shorter than today's day-of-month, so it ended before the
        // equivalent point was reached — the whole month is elapsed, count it all.
        ? new Date(year, m, day, 23, 59, 59, 999)
        // Otherwise stop at the same day AND clock time as right now.
        : new Date(year, m, day, now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds())
    }

    // counts[type][m]    = every event in month m (full month)
    // mtdCounts[type][m] = events in month m up to that month's MTD cutoff
    const mk = () => new Array(12).fill(0)
    const counts: Record<ApptType, number[]> = {
      'Initial Consult': mk(), 'Performance Report': mk(), 'Follow Up': mk(), 'Account Setup': mk()
    }
    const mtdCounts: Record<ApptType, number[]> = {
      'Initial Consult': mk(), 'Performance Report': mk(), 'Follow Up': mk(), 'Account Setup': mk()
    }

    for (const ev of events) {
      const text = ((ev.summary || '') + ' ' + (ev.description || '')).toLowerCase()
      if (!text.trim()) continue
      const type = classify(text)
      if (!type) continue
      const startRaw = ev.start?.dateTime || ev.start?.date
      if (!startRaw) continue
      const start = new Date(startRaw)
      const m = start.getMonth()
      if (m < 0 || m > 11) continue
      counts[type][m]++
      if (start <= cutoffs[m]) mtdCounts[type][m]++
    }

    const appts = TYPES.map((type) => {
      const full = counts[type]
      const mtd = mtdCounts[type]

      // This month is inherently MTD (events fetched only through `now`).
      const thisMonth = full[thisMonthIdx]

      // Like-for-like: last month truncated to the same elapsed period.
      const lastMonth = lastMonthIdx >= 0 ? mtd[lastMonthIdx] : 0
      const lastMonthFull = lastMonthIdx >= 0 ? full[lastMonthIdx] : 0

      // Averages across COMPLETED months (Jan .. previous month)
      let completedFull = 0
      let completedMtd = 0
      for (let i = 0; i < thisMonthIdx; i++) {
        completedFull += full[i]
        completedMtd += mtd[i]
      }
      const avgMonthly = thisMonthIdx > 0 ? avg1(completedFull, thisMonthIdx) : thisMonth
      const avgMtd = thisMonthIdx > 0 ? avg1(completedMtd, thisMonthIdx) : thisMonth

      let ytdTotal = 0
      for (let i = 0; i <= thisMonthIdx; i++) ytdTotal += full[i]

      return { label: type, thisMonth, lastMonth, lastMonthFull, avgMonthly, avgMtd, ytdTotal }
    })

    const totalThisMonth    = appts.reduce((a, t) => a + t.thisMonth, 0)
    const totalLastMonth    = appts.reduce((a, t) => a + t.lastMonth, 0)
    const totalLastMonthFull = appts.reduce((a, t) => a + t.lastMonthFull, 0)

    let totalCompletedFull = 0
    let totalCompletedMtd = 0
    for (let i = 0; i < thisMonthIdx; i++) {
      for (const t of TYPES) {
        totalCompletedFull += counts[t][i]
        totalCompletedMtd += mtdCounts[t][i]
      }
    }
    const totalAvgMonthly = thisMonthIdx > 0 ? avg1(totalCompletedFull, thisMonthIdx) : totalThisMonth
    const totalAvgMtd     = thisMonthIdx > 0 ? avg1(totalCompletedMtd, thisMonthIdx) : totalThisMonth

    const busiest = appts.slice().sort((a, b) => b.thisMonth - a.thisMonth)[0]

    const monthLabel = now.toLocaleString('en-US', { month: 'long' })
    const lastMonthDate = new Date(year, thisMonthIdx - 1, 1)
    const lastMonthLabel = lastMonthDate.toLocaleString('en-US', { month: 'long' })

    // e.g. "Jun 1–15" — the exact window this month is being measured against.
    const compareLabel = lastMonthIdx >= 0
      ? `${lastMonthDate.toLocaleString('en-US', { month: 'short' })} 1\u2013${cutoffDayFor(lastMonthIdx)}`
      : null

    return new Response(JSON.stringify({
      pipeline: {
        appts,
        total_this_month: totalThisMonth,
        total_last_month: totalLastMonth,            // same period last month
        total_last_month_full: totalLastMonthFull,   // context only
        total_avg_monthly: totalAvgMonthly,
        total_avg_mtd: totalAvgMtd,
        busiest_type: busiest && busiest.thisMonth > 0 ? busiest.label : null,
        month_label: monthLabel,
        last_month_label: lastMonthLabel,
        compare_label: compareLabel,
        mtd_day: mtdDay
      },
      meta: {
        source: 'calendar',
        event_count: events.length,
        months_completed: thisMonthIdx,
        basis: 'month-to-date (prior months truncated to same day/time)'
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
