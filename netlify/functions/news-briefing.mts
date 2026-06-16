import type { Context, Config } from "@netlify/functions"

// Federal news briefing: GovExec + Federal News Network RSS feeds.
// No dependencies — light regex-based RSS parsing.

const FEEDS = [
  { source: 'GovExec', url: 'https://www.govexec.com/rss/all/' },
  { source: 'Federal News Network', url: 'https://federalnewsnetwork.com/feed/' }
]

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&#8211;|&#8212;/g, '—')
    .replace(/<[^>]+>/g, '')
    .trim()
}

function parseItems(xml: string, source: string) {
  const items: { source: string; title: string; link: string; published: string }[] = []
  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/g) || []
  for (const block of itemBlocks.slice(0, 6)) {
    const title = block.match(/<title>([\s\S]*?)<\/title>/)?.[1]
    const link = block.match(/<link>([\s\S]*?)<\/link>/)?.[1]
    const pubDate = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]
    if (!title || !link) continue
    items.push({
      source,
      title: decode(title),
      link: decode(link),
      published: pubDate ? new Date(pubDate.trim()).toISOString() : ''
    })
  }
  return items
}

export default async (req: Request, context: Context) => {
  try {
    const all = await Promise.all(
      FEEDS.map(async ({ source, url }) => {
        try {
          const res = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; SFGBriefing/1.0)',
              Accept: 'application/rss+xml, application/xml, text/xml'
            }
          })
          if (!res.ok) return []
          const xml = await res.text()
          return parseItems(xml, source)
        } catch {
          return []
        }
      })
    )

    // Interleave the two sources, newest first within each
    const flattened = all.flat().sort((a, b) =>
      (b.published || '').localeCompare(a.published || '')
    )

    return new Response(JSON.stringify({ news: flattened.slice(0, 10) }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=600'
      },
      status: 200
    })
  } catch (error) {
    console.error('News briefing function error:', error)
    return new Response(JSON.stringify({ news: [] }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    })
  }
}

export const config: Config = {
  path: '/api/news-briefing'
}
