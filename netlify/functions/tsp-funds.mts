import type { Context, Config } from "@netlify/functions"

/**
 * TSP fund share prices from the official TSP public data endpoint.
 * No auth required. Returns the five core funds (G, F, C, S, I) with
 * the most recent share price and day-over-day change.
 *
 * Source: secure.tsp.gov CORS share-price endpoint (publicly accessible).
 */

const FUNDS = ['G Fund', 'F Fund', 'C Fund', 'S Fund', 'I Fund']

function ymd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}${m}${day}`
}

export default async (req: Request, context: Context) => {
  try {
    const end = new Date()
    const start = new Date(end.getTime() - 18 * 24 * 60 * 60 * 1000)

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

    const tsp = FUNDS.filter((f) => colIndex[f] !== undefined).map((fund) => {
      const price = parseFloat(latest[colIndex[fund]])
      const prevPrice = parseFloat(prev[colIndex[fund]])
      const change = price - prevPrice
      const changePct = prevPrice !== 0 ? (change / prevPrice) * 100 : 0
      return {
        label: fund,
        price: Number(price.toFixed(4)),
        change: Number(change.toFixed(4)),
        changePct: Number(changePct.toFixed(2))
      }
    })

    return new Response(JSON.stringify({ tsp, asOf: new Date().toISOString() }), {
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
