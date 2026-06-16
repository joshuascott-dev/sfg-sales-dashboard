import type { Context, Config } from "@netlify/functions"

// Market snapshot for the daily briefing.
// Uses Yahoo Finance's public chart endpoint (no API key required).
// 10-Yr Treasury matters most here: FIA cap & participation rates track it.

const SYMBOLS: { symbol: string; label: string; kind: 'index' | 'yield' }[] = [
  { symbol: '^GSPC', label: 'S&P 500', kind: 'index' },
  { symbol: '^DJI', label: 'Dow', kind: 'index' },
  { symbol: '^IXIC', label: 'Nasdaq', kind: 'index' },
  { symbol: '^TNX', label: '10-Yr Treasury', kind: 'yield' }
]

export default async (req: Request, context: Context) => {
  try {
    const results = await Promise.all(
      SYMBOLS.map(async ({ symbol, label, kind }) => {
        try {
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`
          const res = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
              Accept: 'application/json'
            }
          })
          if (!res.ok) return null
          const data = await res.json()
          const meta = data?.chart?.result?.[0]?.meta
          if (!meta) return null

          const price: number = meta.regularMarketPrice
          const prevClose: number = meta.chartPreviousClose ?? meta.previousClose
          if (typeof price !== 'number' || typeof prevClose !== 'number' || prevClose === 0) return null

          const change = price - prevClose
          const changePct = (change / prevClose) * 100

          return {
            label,
            kind,
            price: kind === 'yield' ? Number(price.toFixed(2)) : Math.round(price * 100) / 100,
            change: Number(change.toFixed(2)),
            changePct: Number(changePct.toFixed(2))
          }
        } catch {
          return null
        }
      })
    )

    const markets = results.filter(Boolean)

    return new Response(JSON.stringify({ markets, asOf: new Date().toISOString() }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300'
      },
      status: 200
    })
  } catch (error) {
    console.error('Market data function error:', error)
    return new Response(JSON.stringify({ markets: [] }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })
  }
}

export const config: Config = {
  path: '/api/market-data'
}
