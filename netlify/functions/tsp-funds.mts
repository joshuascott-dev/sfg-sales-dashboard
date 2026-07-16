import type { Context, Config } from "@netlify/functions"

/**
 * TSP fund share prices from the official TSP public data endpoint.
 * No auth required. Returns the five core funds (G, F, C, S, I) with the most
 * recent share price, day-over-day change, and year-to-date return.
 *
 * Source: secure.tsp.gov CORS share-price endpoint (publicly accessible).
 * CSV schema: Date, L Income, L 2025 ... L 2065, G Fund, F Fund, C Fund, S Fund, I Fund
 *
 * YTD basis: share prices are total-return NAVs (TSP funds pay no distributions —
 * dividends/interest are reflected in the share price), so a simple
 * price-to-price ratio IS the total return. No dividend adjustment needed.
 *
 * The baseline is the LAST CLOSE OF THE PRIOR YEAR, not the first trading day of
 * January. Using January's first close would silently discard that day's move.
 * The fetch window therefore starts in mid-December of the prior year, and we
 * take the last row whose date falls before Jan 1.
 */

const FUNDS = ['G Fund', 'F Fund', 'C Fund', 'S Fund', 'I Fund']

function ymd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

/**
 * The endpoint's date column format isn't contractually guaranteed, so accept
 * the plausible shapes rather than trusting one. Returns null if unparseable —
 * callers must treat that as "no YTD" instead of guessing a baseline.
 */
function parseRowDate(raw: string): Date | null {
  if (!raw) return null
  const s = raw.trim().replace(/^"|"$/g, '')
  if (!s) return null

  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)            // 2026-01-02
  if (m) return new Date(+m[1], +m[2] - 1, +m[3])

  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)              // 01/02/2026 (US M/D/Y)
  if (m) return new Date(+m[3], +m[1] - 1, +m[2])

  const d = new Date(s)                                       // "Jan 2, 2026" etc.
  return isNaN(d.getTime()) ? null : d
}

export default async (req: Request, context: Context) => {
  try {
    const end = new Date()
    const year = end.getFullYear()
    // Reach back into mid-December of last year to capture the prior-year close.
    const start = new Date(year - 1, 11, 15)

    const url =
      `https://secure.tsp.gov/components/CORS/getSharePricesRaw.html` +
      `?startdate=${ymd(start)}&enddate=${ymd(end)}&Lfunds=1&InvFunds=1&download=0`

    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        Accept: 'text/csv,text/plain,*/*'
      }
    })

    if (!res.ok) {
      return new Response(JSON.stringify({ tsp: [], error: `tsp_${res.status}` }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      })
    }

    const csv = await res.text()
    const lines = csv.trim().split(/\r?\n/).filter((l) => l.trim())
    if (lines.length < 2) {
      return new Response(JSON.stringify({ tsp: [], error: 'no_rows' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      })
    }

    const headers = lines[0].split(',').map((h) => h.trim())
    const colIndex: Record<string, number> = {}
    for (const fund of FUNDS) {
      const idx = headers.findIndex((h) => h.toLowerCase() === fund.toLowerCase())
      if (idx >= 0) colIndex[fund] = idx
    }
    const dateIdx = headers.findIndex((h) => h.toLowerCase() === 'date')

    const anyFund = FUNDS.find((f) => colIndex[f] !== undefined)
    if (!anyFund) {
      return new Response(JSON.stringify({ tsp: [], error: 'no_fund_columns' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      })
    }

    const rows = lines.slice(1).map((l) => l.split(',').map((c) => c.trim()))
    const valid = rows.filter((r) => {
      const v = parseFloat(r[colIndex[anyFund]])
      return !isNaN(v) && v > 0
    })

    if (valid.length < 2) {
      return new Response(JSON.stringify({ tsp: [], error: 'insufficient_data' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      })
    }

    const latest = valid[valid.length - 1]
    const prev = valid[valid.length - 2]

    // ---- YTD baseline: last close of the prior year ----------------------
    // Only trust a baseline we can actually date. If the date column is absent
    // or unparseable we return ytdPct: null rather than inventing a number.
    let baseline: string[] | null = null
    let ytdBasis: 'prior_year_close' | 'first_close_of_year' | 'unavailable' = 'unavailable'
    let ytdFrom: string | null = null

    if (dateIdx >= 0) {
      const dated = valid
        .map((r) => ({ row: r, date: parseRowDate(r[dateIdx]) }))
        .filter((x): x is { row: string[]; date: Date } => x.date !== null)

      const priorYear = dated.filter((x) => x.date.getFullYear() < year)
      if (priorYear.length > 0) {
        const b = priorYear[priorYear.length - 1]
        baseline = b.row
        ytdBasis = 'prior_year_close'
        ytdFrom = b.date.toISOString().slice(0, 10)
      } else {
        // Endpoint returned nothing from last year (short window, or it's early
        // January before the prior-year close is in range). Fall back to the
        // first close of this year — this understates YTD by day one's move,
        // so the basis is reported for honesty.
        const thisYear = dated.filter((x) => x.date.getFullYear() === year)
        if (thisYear.length > 0) {
          baseline = thisYear[0].row
          ytdBasis = 'first_close_of_year'
          ytdFrom = thisYear[0].date.toISOString().slice(0, 10)
        }
      }
    }

    const tsp = FUNDS.filter((f) => colIndex[f] !== undefined).map((fund) => {
      const price = parseFloat(latest[colIndex[fund]])
      const prevPrice = parseFloat(prev[colIndex[fund]])
      const change = price - prevPrice
      const changePct = prevPrice !== 0 ? (change / prevPrice) * 100 : 0

      let ytdPct: number | null = null
      if (baseline) {
        const basePrice = parseFloat(baseline[colIndex[fund]])
        if (!isNaN(basePrice) && basePrice > 0) {
          ytdPct = Number(((price / basePrice - 1) * 100).toFixed(2))
        }
      }

      return {
        label: fund,
        price: Number(price.toFixed(4)),
        change: Number(change.toFixed(4)),
        changePct: Number(changePct.toFixed(2)),
        ytdPct
      }
    })

    return new Response(JSON.stringify({
      tsp,
      asOf: new Date().toISOString(),
      ytdBasis,
      ytdFrom
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600'
      },
      status: 200
    })
  } catch (error) {
    console.error('TSP funds function error:', error)
    return new Response(JSON.stringify({ tsp: [] }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })
  }
}

export const config: Config = {
  path: '/api/tsp-funds'
}
