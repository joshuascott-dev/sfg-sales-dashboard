import React, { useState, useEffect, useMemo } from 'react'

/* ============================================================
   SVG Components — custom federal seal & decorations (no real seals)
   ============================================================ */

function FebaSeal({ size = 56, variant = 'dark' }: { size?: number; variant?: 'dark' | 'light' }) {
  const navy = '#1E1D3F'
  const navyMid = '#3C3B6E'
  const red = '#B22234'
  const uid = variant

  // Ring of stars near the rim
  const stars = Array.from({ length: 13 }).map((_, i) => {
    const angle = (i / 13) * 2 * Math.PI - Math.PI / 2
    const r = 81
    const x = 100 + r * Math.cos(angle)
    const y = 100 + r * Math.sin(angle)
    return { x, y, key: i }
  })

  return (
    <svg width={size} height={size} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-label="Federal Employee Benefit Advisors seal">
      <defs>
        <radialGradient id={`feba-field-${uid}`} cx="50%" cy="42%">
          <stop offset="0%" stopColor={navyMid} />
          <stop offset="100%" stopColor={navy} />
        </radialGradient>
        <path id={`feba-arc-${uid}`} d="M 100 100 m -68 0 a 68 68 0 1 1 136 0" />
      </defs>

      {/* Red outer ring */}
      <circle cx="100" cy="100" r="98" fill={red} />
      {/* Navy field */}
      <circle cx="100" cy="100" r="90" fill={`url(#feba-field-${uid})`} />
      {/* Thin white separator rings */}
      <circle cx="100" cy="100" r="90" fill="none" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.55" />
      <circle cx="100" cy="100" r="62" fill="none" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.45" />

      {/* Curved organization name along the top arc */}
      <text fill="#FFFFFF" fontFamily="Source Serif 4, Georgia, serif" fontSize="13.5" fontWeight="600" letterSpacing="1.5" opacity="0.92">
        <textPath href={`#feba-arc-${uid}`} startOffset="50%" textAnchor="middle">
          FEDERAL EMPLOYEE BENEFIT ADVISORS
        </textPath>
      </text>

      {/* Slowly rotating ring of stars */}
      <g>
        <animateTransform attributeName="transform" type="rotate"
          from="0 100 100" to="360 100 100" dur="220s" repeatCount="indefinite" />
        {stars.map(({ x, y, key }) => (
          <Star5 key={key} cx={x} cy={y} size={2.6} fill="#FFFFFF" />
        ))}
      </g>

      {/* Inner navy disc */}
      <circle cx="100" cy="100" r="60" fill={navy} />

      {/* FEBA monogram */}
      <text x="100" y="108" textAnchor="middle"
            fill="#FFFFFF"
            fontFamily="Source Serif 4, Georgia, serif"
            fontSize="38" fontWeight="700"
            letterSpacing="2.5">
        FEBA
      </text>
      {/* Small flanking stars under the wordmark */}
      <Star5 cx={78} cy={124} size={3} fill={red} />
      <Star5 cx={100} cy={124} size={3} fill="#FFFFFF" />
      <Star5 cx={122} cy={124} size={3} fill={red} />
    </svg>
  )
}

function Star5({ cx, cy, size = 4, fill = '#FFFFFF' }: { cx: number; cy: number; size?: number; fill?: string }) {
  // 5-pointed star, centered at (cx, cy)
  const points: string[] = []
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? size : size * 0.4
    const angle = (i / 10) * 2 * Math.PI - Math.PI / 2
    const x = cx + r * Math.cos(angle)
    const y = cy + r * Math.sin(angle)
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`)
  }
  return <polygon points={points.join(' ')} fill={fill} />
}

function WavingFlag({ width = 200 }: { width?: number }) {
  // Animated US flag: 13 stripes, 50-star canton, gentle ripple via displacement filter
  const W = 190
  const H = 100
  const stripeH = H / 13
  const cantonW = W * 0.4
  const cantonH = stripeH * 7

  // 50 stars in 9 rows (6,5,6,5,6,5,6,5,6)
  const starEls: JSX.Element[] = []
  const rows = 9
  for (let r = 0; r < rows; r++) {
    const isLong = r % 2 === 0
    const cols = isLong ? 6 : 5
    const y = (cantonH / (rows + 1)) * (r + 1)
    for (let c = 0; c < cols; c++) {
      const step = cantonW / (cols + 1)
      const x = step * (c + 1)
      starEls.push(<Star5 key={`${r}-${c}`} cx={x} cy={y} size={2.0} fill="#FFFFFF" />)
    }
  }

  return (
    <div className="wflag-wrap" style={{ width }}>
      <svg viewBox={`0 0 ${W} ${H}`} width={width} className="wflag" xmlns="http://www.w3.org/2000/svg" aria-label="American flag">
        <defs>
          <filter id="wflag-ripple" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="2" seed="7" result="noise">
              <animate attributeName="baseFrequency" dur="11s"
                values="0.012 0.02;0.018 0.014;0.012 0.02" repeatCount="indefinite" />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="6" xChannelSelector="R" yChannelSelector="G" />
          </filter>
          <linearGradient id="wflag-shade" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#000" stopOpacity="0.12" />
            <stop offset="18%" stopColor="#fff" stopOpacity="0.10" />
            <stop offset="42%" stopColor="#000" stopOpacity="0.10" />
            <stop offset="68%" stopColor="#fff" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.14" />
          </linearGradient>
        </defs>

        <g filter="url(#wflag-ripple)">
          {/* 13 stripes */}
          {Array.from({ length: 13 }).map((_, i) => (
            <rect key={i} x="0" y={i * stripeH} width={W} height={stripeH + 0.4}
              fill={i % 2 === 0 ? '#B22234' : '#FFFFFF'} />
          ))}
          {/* Canton */}
          <rect x="0" y="0" width={cantonW} height={cantonH} fill="#3C3B6E" />
          {starEls}
          {/* Shading overlay for depth */}
          <rect x="0" y="0" width={W} height={H} fill="url(#wflag-shade)" />
        </g>
      </svg>
    </div>
  )
}

function StarsField({ count = 60 }: { count?: number }) {
  // Random stars, generated once. Decorative background for client hero.
  const stars = useMemo(() => {
    const seed = 42
    const rand = (n: number) => {
      const x = Math.sin(seed * n) * 10000
      return x - Math.floor(x)
    }
    return Array.from({ length: count }).map((_, i) => ({
      x: rand(i * 2 + 1) * 100,
      y: rand(i * 2 + 2) * 100,
      r: 0.3 + rand(i + 3) * 0.6,
      opacity: 0.12 + rand(i + 4) * 0.25
    }))
  }, [count])

  return (
    <svg className="client-stars" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#3C3B6E" opacity={s.opacity} />
      ))}
    </svg>
  )
}

function CapitolSilhouette() {
  // Stylized abstraction of a domed federal building — evocative, not a copy
  return (
    <svg className="capitol" viewBox="0 0 400 100" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      <g fill="currentColor">
        {/* Base steps */}
        <rect x="40" y="88" width="320" height="12" />
        <rect x="60" y="80" width="280" height="8" />
        {/* Columns (5) */}
        {[120, 160, 200, 240, 280].map(x => (
          <rect key={x} x={x - 4} y="50" width="8" height="30" />
        ))}
        {/* Entablature */}
        <rect x="100" y="44" width="200" height="6" />
        {/* Drum */}
        <rect x="160" y="26" width="80" height="18" />
        {/* Dome (semicircle approximation) */}
        <path d="M 160 26 Q 160 -4 200 -4 Q 240 -4 240 26 Z" />
        {/* Lantern */}
        <rect x="195" y="-12" width="10" height="10" />
        {/* Flagpole + flag */}
        <rect x="199" y="-32" width="2" height="22" />
      </g>
    </svg>
  )
}

/* ============================================================
   Animation utilities
   ============================================================ */

function useCountUp(target: number, duration = 1100, decimals = 0): string {
  const [val, setVal] = useState(0)
  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3) // easeOutCubic
      setVal(target * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
      else setVal(target)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return decimals > 0 ? val.toFixed(decimals) : String(Math.round(val))
}

function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const display = useCountUp(value, 1100, decimals)
  return <span className="num">{display}</span>
}

function DeltaBadge({ current, prior, label }: { current: number; prior: number; label?: string }) {
  const diff = current - prior
  if (diff === 0) {
    return <span className="delta delta-flat">— even{label ? ` vs ${label}` : ''}</span>
  }
  const up = diff > 0
  return (
    <span className={`delta ${up ? 'delta-up' : 'delta-down'}`}>
      {up ? '▲' : '▼'} {Math.abs(diff)}{label ? ` vs ${label}` : ''}
    </span>
  )
}

/* ============================================================
   Marquee ticker — markets + TSP funds, continuous scroll
   ============================================================ */

function MarqueeTicker({ markets, tsp }: { markets: MarketQuote[]; tsp: TspFund[] }) {
  type Item = { label: string; priceStr: string; changePct: number; ytdPct?: number | null; group: 'mkt' | 'tsp' }

  const items: Item[] = useMemo(() => {
    const m: Item[] = markets.map(q => ({
      label: q.label,
      priceStr: q.kind === 'yield' ? `${q.price.toFixed(2)}%` : q.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      changePct: q.changePct,
      group: 'mkt'
    }))
    const t: Item[] = tsp.map(f => ({
      label: f.label,
      priceStr: `$${f.price.toFixed(2)}`,
      changePct: f.changePct,
      ytdPct: f.ytdPct,
      group: 'tsp'
    }))
    return [...m, ...t]
  }, [markets, tsp])

  if (items.length === 0) return null

  const renderItem = (it: Item, key: string) => (
    <span className="tick" key={key}>
      {it.group === 'tsp' && <span className="tick-badge">TSP</span>}
      <span className="tick-label">{it.label}</span>
      <span className="tick-price">{it.priceStr}</span>
      <span className={`tick-chg ${it.changePct >= 0 ? 'up' : 'down'}`}>
        {it.changePct >= 0 ? '▲' : '▼'} {Math.abs(it.changePct).toFixed(2)}%
      </span>
      {it.ytdPct !== null && it.ytdPct !== undefined && (
        <span className={`tick-ytd ${it.ytdPct >= 0 ? 'up' : 'down'}`} title="Year to date">
          YTD {it.ytdPct >= 0 ? '+' : '−'}{Math.abs(it.ytdPct).toFixed(2)}%
        </span>
      )}
    </span>
  )

  // Duration scales with item count for consistent speed
  const dur = Math.max(28, items.length * 3.4)

  return (
    <div className="marquee">
      <div className="marquee-live">
        <span className="marquee-live-dot" />
        LIVE
      </div>
      <div className="marquee-viewport">
        <div className="marquee-track" style={{ animationDuration: `${dur}s` }}>
          {items.map((it, i) => renderItem(it, `a-${i}`))}
          {items.map((it, i) => renderItem(it, `b-${i}`))}
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   Types
   ============================================================ */
interface CalendarEvent {
  time: string
  type: string
  prospect: string
  stage: string
  priority: boolean
  eventId?: string
}

interface Email {
  prospect: string
  subject: string
  status: 'new' | 'ready_to_send' | 'waiting_reply'
  days_ago: number
  threadId?: string
}

interface ApptType {
  label: string
  thisMonth: number
  lastMonth: number       // same period last month (MTD), not the full month
  lastMonthFull: number   // full prior month — context only
  avgMonthly: number
  avgMtd: number          // avg count by this day-of-month across completed months
  ytdTotal: number
}

interface PipelineData {
  appts: ApptType[]
  total_this_month: number
  total_last_month: number
  total_last_month_full: number
  total_avg_monthly: number
  total_avg_mtd: number
  busiest_type: string | null
  month_label: string
  last_month_label: string
  compare_label: string | null
  mtd_day: number
}

interface MarketQuote {
  label: string
  kind: 'index' | 'yield'
  price: number
  change: number
  changePct: number
}

interface TspFund {
  label: string
  price: number
  change: number
  changePct: number
  ytdPct?: number | null
}

interface NewsItem {
  source: string
  title: string
  link: string
  published: string
}

interface UnreadMsg {
  id: string
  from: string
  subject: string
  snippet: string
  hoursAgo: number | null
}

interface Task {
  id: string
  title: string
  notes: string
  due: string | null
  status: 'needsAction' | 'completed'
  updated?: string | null
}

type Tab = 'dashboard' | 'notes'

const STAGE_ORDER = ['Initial Consult', 'PRC', 'Follow Up', 'Account Setup', 'Closed Won']
const NOTES_URL = 'https://febanotes.netlify.app/feba-notes.html'

/* ============================================================
   Helpers
   ============================================================ */
const fmtMoney = (v: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(v)

/** Parse "10:00 AM" → Date today (local). Returns null if unparseable. */
function parseEventTime(t: string): Date | null {
  const m = t.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!m) return null
  let h = parseInt(m[1], 10)
  const min = parseInt(m[2], 10)
  const pm = m[3].toUpperCase() === 'PM'
  if (pm && h !== 12) h += 12
  if (!pm && h === 12) h = 0
  const d = new Date()
  d.setHours(h, min, 0, 0)
  return d
}

function useClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

function readParam(key: string): string | null {
  return new URLSearchParams(window.location.search).get(key)
}

function writeParam(key: string, value: string | null) {
  const url = new URL(window.location.href)
  if (value) url.searchParams.set(key, value)
  else url.searchParams.delete(key)
  window.history.pushState({}, '', url.toString())
}

/* ============================================================
   App
   ============================================================ */
export default function App() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [emails, setEmails] = useState<Email[]>([])
  const [pipeline, setPipeline] = useState<PipelineData | null>(null)
  const [markets, setMarkets] = useState<MarketQuote[]>([])
  const [tsp, setTsp] = useState<TspFund[]>([])
  const [news, setNews] = useState<NewsItem[]>([])
  const [unread, setUnread] = useState<UnreadMsg[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [usingSample, setUsingSample] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [clientView, setClientView] = useState(() => readParam('view') === 'client')
  const [tab, setTab] = useState<Tab>(() => (readParam('tab') === 'notes' ? 'notes' : 'dashboard'))
  const now = useClock()

  const switchTab = (t: Tab) => {
    writeParam('tab', t === 'notes' ? 'notes' : null)
    setTab(t)
  }

  const openClientView = (on: boolean) => {
    if (on) {
      // Open the client view in a new tab so FEBA Notes stays open here
      const url = new URL(window.location.href)
      url.searchParams.set('view', 'client')
      url.searchParams.delete('tab')
      window.open(url.toString(), '_blank', 'noopener')
      return
    }
    writeParam('view', null)
    setClientView(false)
  }

  useEffect(() => {
    const onPop = () => {
      setTab(readParam('tab') === 'notes' ? 'notes' : 'dashboard')
      setClientView(readParam('view') === 'client')
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const fetchData = async () => {
    try {
      setRefreshing(true)
      let sample = false
      const [calRes, mailRes, pipeRes, mktRes, tspRes, newsRes, unreadRes] = await Promise.all([
        fetch('/api/calendar-events').catch(() => null),
        fetch('/api/gmail-threads').catch(() => null),
        fetch('/api/pipeline-data').catch(() => null),
        fetch('/api/market-data').catch(() => null),
        fetch('/api/tsp-funds').catch(() => null),
        fetch('/api/news-briefing').catch(() => null),
        fetch('/api/unread-inbox').catch(() => null)
      ])

      if (calRes?.ok) {
        const d = await calRes.json()
        setEvents(d.events || [])
      } else { setEvents(SAMPLE_EVENTS); sample = true }

      if (mailRes?.ok) {
        const d = await mailRes.json()
        setEmails(d.emails || [])
      } else { setEmails(SAMPLE_EMAILS); sample = true }

      if (pipeRes?.ok) {
        const d = await pipeRes.json()
        setPipeline(d.pipeline || null)
      } else { setPipeline(SAMPLE_PIPELINE); sample = true }

      if (mktRes?.ok) {
        const d = await mktRes.json()
        setMarkets(d.markets || [])
      }

      if (tspRes?.ok) {
        const d = await tspRes.json()
        setTsp((d.tsp && d.tsp.length > 0) ? d.tsp : SAMPLE_TSP)
      } else {
        setTsp(SAMPLE_TSP)
      }

      if (newsRes?.ok) {
        const d = await newsRes.json()
        setNews(d.news || [])
      }

      if (unreadRes?.ok) {
        const d = await unreadRes.json()
        setUnread(d.unread || [])
      }

      setUsingSample(sample)
      setLastUpdate(new Date())
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
    const id = setInterval(fetchData, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  /* next upcoming call + countdown */
  const nextCall = useMemo(() => {
    const upcoming = events
      .map(e => ({ ...e, at: parseEventTime(e.time) }))
      .filter(e => e.at && e.at.getTime() > now.getTime())
      .sort((a, b) => a.at!.getTime() - b.at!.getTime())
    return upcoming[0] || null
  }, [events, now])

  const countdown = useMemo(() => {
    if (!nextCall?.at) return null
    const ms = nextCall.at.getTime() - now.getTime()
    const totalMin = Math.floor(ms / 60000)
    const h = Math.floor(totalMin / 60)
    const m = totalMin % 60
    const s = Math.floor((ms % 60000) / 1000)
    if (h > 0) return `T-minus ${h}h ${m}m`
    if (totalMin >= 1) return `T-minus ${m}m ${s.toString().padStart(2, '0')}s`
    return `T-minus ${s}s`
  }, [nextCall, now])

  if (loading) {
    return (
      <div className="load">
        <div className="load-title">Federal Employee <span className="accent">Benefit Advisors</span></div>
        <div className="pulse" />
        <div className="load-sub">Syncing pipeline · calendar · markets · inbox</div>
      </div>
    )
  }

  if (clientView) {
    return <ClientScreen now={now} onExit={() => {
      // If this client view was opened in its own tab, close it; otherwise exit in place
      window.close()
      openClientView(false)
    }} />
  }

  const clock = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  const dateLine = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div className="shell">
      <header className="board">
        <div className="wrap">
          <div className="board-row">
            <div className="brand">
              <FebaSeal size={48} variant="dark" />
              <div className="brand-text">
                <div className="brand-mark">Federal Employee <span className="gold">Benefit Advisors</span></div>
                <div className="brand-sub">Advisor command · Federal retirement specialists</div>
              </div>
            </div>
            <div className="board-clock">
              <div>
                <div className="clock-time num">{clock}</div>
                <div className="clock-date">{dateLine}</div>
              </div>
            </div>
            <div className="board-actions">
              {tab === 'dashboard' && (
                <button className="btn" onClick={fetchData} disabled={refreshing}>
                  <span className={refreshing ? 'spin' : ''}>⟳</span>&nbsp; {refreshing ? 'Syncing' : 'Refresh'}
                </button>
              )}
              {tab === 'notes' && (
                <button className="btn btn-red" onClick={() => openClientView(true)}>
                  ★&nbsp; Launch client view
                </button>
              )}
            </div>
          </div>

          {/* tabs */}
          <nav className="tabs">
            <button className={`tab ${tab === 'dashboard' ? 'on' : ''}`} onClick={() => switchTab('dashboard')}>
              Advisor dashboard
            </button>
            <button className={`tab ${tab === 'notes' ? 'on' : ''}`} onClick={() => switchTab('notes')}>
              FEBA Notes
            </button>
          </nav>
        </div>

        {tab === 'dashboard' && (
          <>
            <div className={`ticker ${nextCall ? '' : 'ticker-quiet'}`}>
              <div className="wrap">
                <div className="ticker-row">
                  {nextCall ? (
                    <>
                      <span className="ticker-label">
                        {nextCall.priority ? 'Priority · Next call' : 'Next call'}
                      </span>
                      <span className="ticker-text num">
                        {nextCall.time} · {nextCall.prospect} <span className="dim">— {nextCall.type}</span>
                      </span>
                      <span className="ticker-countdown num">{countdown}</span>
                    </>
                  ) : (
                    <>
                      <span className="ticker-label">Board clear</span>
                      <span className="ticker-text dim">No more calls on today's schedule</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <MarqueeTicker markets={markets} tsp={tsp} />
          </>
        )}
      </header>

      {tab === 'notes' ? (
        <div className="notes-wrap">
          <div className="notes-bar">
            <div className="notes-bar-text">
              <span className="notes-bar-title">FEBA Notes</span>
              <span className="notes-bar-sub">Live client tools · calculators, rapport notes &amp; session capture</span>
            </div>
            <button className="btn btn-red notes-bar-btn" onClick={() => openClientView(true)}>
              ★&nbsp; Launch client view
            </button>
          </div>
          <div className="notes-frame">
            <iframe src={NOTES_URL} title="FEBA Notes" />
          </div>
        </div>
      ) : (
        <main className="wrap">
          {/* morning briefing — synthesized summary */}
          <BriefingPanel
            now={now}
            events={events}
            emails={emails}
            markets={markets}
            news={news}
            unread={unread}
            nextCall={nextCall}
            pipeline={pipeline}
          />

          {/* stat band — appointment activity (no dollars) */}
          <section className="stats reveal" style={{ animationDelay: '0.05s' }}>
            <div className="stat">
              <div className="stat-label">
                {pipeline ? `${pipeline.month_label} appointments · MTD` : 'This month appointments'}
              </div>
              <div className="stat-value gold">
                {pipeline ? <AnimatedNumber value={pipeline.total_this_month} /> : '—'}
              </div>
              <div className="stat-note">
                {pipeline
                  ? <DeltaBadge current={pipeline.total_this_month} prior={pipeline.total_last_month} label={pipeline.compare_label ?? pipeline.last_month_label} />
                  : 'booked on the calendar'}
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Monthly average</div>
              <div className="stat-value">
                {pipeline ? <AnimatedNumber value={pipeline.total_avg_monthly} decimals={1} /> : '—'}
              </div>
              <div className="stat-note">across completed months, YTD</div>
            </div>
            <div className="stat">
              <div className="stat-label">Performance reports</div>
              <div className="stat-value">
                {pipeline ? <AnimatedNumber value={apptCount(pipeline, 'Performance Report')} /> : '—'}
              </div>
              <div className="stat-note">close opportunities this month</div>
            </div>
            <div className="stat">
              <div className="stat-label">Account setups</div>
              <div className="stat-value">
                {pipeline ? <AnimatedNumber value={apptCount(pipeline, 'Account Setup')} /> : '—'}
              </div>
              <div className="stat-note">closes this month</div>
            </div>
          </section>

          {/* row 1: tasks + today's calls */}
          <section className="grid grid-2 reveal" style={{ animationDelay: '0.1s' }}>
            <TasksPanel />
            <CallsPanel events={events} now={now} />
          </section>

          {/* row 2: appointment activity + prospect actions */}
          <section className="grid grid-2 reveal" style={{ animationDelay: '0.16s' }}>
            <ApptActivityPanel pipeline={pipeline} />
            <ActionsPanel emails={emails} />
          </section>

          {/* row 2: federal briefing / unread inbox */}
          <section className="grid grid-2 reveal" style={{ animationDelay: '0.2s' }}>
            <div className="panel">
              <div className="panel-head">
                <div className="panel-title">Federal briefing</div>
                <div className="panel-meta">GovExec · Federal News Network</div>
              </div>
              {news.length === 0 && <div className="item-sub">News feeds unavailable right now.</div>}
              {news.map((n, i) => (
                <a className="news" key={i} href={n.link} target="_blank" rel="noopener noreferrer">
                  <span className={`news-src ${n.source === 'GovExec' ? 'src-ge' : 'src-fnn'}`}>
                    {n.source === 'GovExec' ? 'GE' : 'FNN'}
                  </span>
                  <span className="news-title">{n.title}</span>
                </a>
              ))}
            </div>

            <div className="panel">
              <div className="panel-head">
                <div className="panel-title">Unread inbox</div>
                <div className="panel-meta num">{unread.length} unread · last 3 days</div>
              </div>
              {unread.length === 0 && <div className="item-sub">Inbox zero — nothing unread.</div>}
              {unread.map((u) => (
                <div className="item" key={u.id}>
                  <div className="item-top">
                    <span className="item-name">{u.from}</span>
                    {u.hoursAgo !== null && (
                      <span className="item-age num">{u.hoursAgo < 1 ? 'now' : u.hoursAgo < 24 ? `${u.hoursAgo}h` : `${Math.floor(u.hoursAgo / 24)}d`}</span>
                    )}
                  </div>
                  <div className="item-strong">{u.subject}</div>
                  <div className="item-sub">{u.snippet}</div>
                </div>
              ))}
            </div>
          </section>


          {/* ── Commission Tracker ── */}
          <CommissionTracker />

          {/* ── Rollover Eligibility ── */}
          <AgeEligibilityTracker />

                    <div className="foot num">
            {usingSample ? 'Showing sample data — live API connection unavailable · ' : ''}
            Last sync {lastUpdate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} · auto-refreshes every 5 minutes
          </div>
        </main>
      )}
    </div>
  )
}

/* ============================================================
   Panels
   ============================================================ */
function CallsPanel({ events, now }: { events: CalendarEvent[]; now: Date }) {
  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title">Today's calls</div>
        <div className="panel-meta num">{events.length} scheduled</div>
      </div>
      <div className="rail">
        {events.map((e, i) => {
          const at = parseEventTime(e.time)
          const past = at ? at.getTime() < now.getTime() - 30 * 60000 : false
          return (
            <div key={i} className={`call ${e.priority ? 'priority' : ''} ${past ? 'past' : ''}`}>
              <div className="call-top">
                <span className="call-time num">{e.time}</span>
                {e.priority && <span className="chip chip-red">Close op</span>}
              </div>
              <div className="call-name">{e.prospect}</div>
              <div className="call-type">{e.type} · {e.stage}</div>
            </div>
          )
        })}
        {events.length === 0 && <div className="item-sub">No calls on the calendar today.</div>}
      </div>
    </div>
  )
}

function apptCount(pipeline: PipelineData, label: string): number {
  return pipeline.appts.find(a => a.label === label)?.thisMonth ?? 0
}

function TasksPanel() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loaded, setLoaded] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    try {
      const r = await fetch('/api/tasks-list?cb=' + Date.now())
      const d = await r.json()
      if (d.error) setErr(d.error)
      else setErr(null)
      setTasks(d.tasks || [])
    } catch {
      setErr('fetch_failed')
    } finally {
      setLoaded(true)
    }
  }

  useEffect(() => { load() }, [])

  const addTask = async () => {
    const title = draft.trim()
    if (!title || busy) return
    setBusy(true)
    // optimistic
    const tempId = 'tmp-' + Date.now()
    setTasks(prev => [{ id: tempId, title, notes: '', due: null, status: 'needsAction' }, ...prev])
    setDraft('')
    try {
      const r = await fetch('/api/tasks-mutate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', title })
      })
      const d = await r.json()
      if (d.ok && d.task) {
        setTasks(prev => prev.map(t => t.id === tempId ? d.task : t))
      } else {
        setTasks(prev => prev.filter(t => t.id !== tempId))
        setErr(d.error || 'add_failed')
      }
    } catch {
      setTasks(prev => prev.filter(t => t.id !== tempId))
    } finally {
      setBusy(false)
    }
  }

  const toggle = async (task: Task) => {
    const next = task.status === 'completed' ? 'needsAction' : 'completed'
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: next } : t))
    try {
      await fetch('/api/tasks-mutate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', id: task.id, status: next })
      })
    } catch { /* keep optimistic */ }
  }

  const remove = async (task: Task) => {
    setTasks(prev => prev.filter(t => t.id !== task.id))
    try {
      await fetch('/api/tasks-mutate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: task.id })
      })
    } catch { /* keep optimistic */ }
  }

  const active = tasks.filter(t => t.status === 'needsAction')
  const done = tasks.filter(t => t.status === 'completed')

  const dueLabel = (due: string | null) => {
    if (!due) return null
    const d = new Date(due)
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const dd = new Date(d); dd.setHours(0, 0, 0, 0)
    const diff = Math.round((dd.getTime() - today.getTime()) / 86400000)
    if (diff < 0) return { text: `${Math.abs(diff)}d overdue`, cls: 'due-late' }
    if (diff === 0) return { text: 'Today', cls: 'due-today' }
    if (diff === 1) return { text: 'Tomorrow', cls: 'due-soon' }
    return { text: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), cls: 'due-far' }
  }

  return (
    <div className="panel tasks-panel">
      <div className="panel-head">
        <div className="panel-title">Tasks</div>
        <div className="panel-meta">
          {err ? 'Sync unavailable' : `${active.length} open · Google Tasks`}
        </div>
      </div>

      <div className="task-add">
        <input
          className="task-input"
          placeholder="Add a task…"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addTask() }}
        />
        <button className="task-add-btn" onClick={addTask} disabled={busy || !draft.trim()} aria-label="Add task">＋</button>
      </div>

      {!loaded && <div className="item-sub">Loading tasks…</div>}

      {loaded && err && (
        <div className="task-empty">
          {err.includes('403')
            ? 'Re-authorize with Tasks access to enable sync.'
            : err.includes('401')
            ? 'Session expired — refresh the Google token to sync tasks.'
            : 'Tasks sync is currently unavailable.'}
        </div>
      )}

      {loaded && !err && active.length === 0 && done.length === 0 && (
        <div className="task-empty">No tasks yet — add one above. It'll sync to Google.</div>
      )}

      {active.map(t => {
        const dl = dueLabel(t.due)
        return (
          <div className="task" key={t.id}>
            <button className="task-check" onClick={() => toggle(t)} aria-label="Complete task" />
            <div className="task-body">
              <span className="task-title">{t.title}</span>
              {dl && <span className={`task-due ${dl.cls}`}>{dl.text}</span>}
            </div>
            <button className="task-del" onClick={() => remove(t)} aria-label="Delete task">×</button>
          </div>
        )
      })}

      {done.length > 0 && (
        <div className="task-done-group">
          <div className="task-done-label">Completed · {done.length}</div>
          {done.slice(0, 5).map(t => (
            <div className="task task-completed" key={t.id}>
              <button className="task-check on" onClick={() => toggle(t)} aria-label="Reopen task">✓</button>
              <div className="task-body"><span className="task-title">{t.title}</span></div>
              <button className="task-del" onClick={() => remove(t)} aria-label="Delete task">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ApptActivityPanel({ pipeline }: { pipeline: PipelineData | null }) {
  const maxVal = useMemo(() => {
    if (!pipeline) return 1
    return Math.max(1, ...pipeline.appts.map(a => Math.max(a.thisMonth, a.lastMonth, a.avgMtd)))
  }, [pipeline])

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title">Appointment activity</div>
        <div className="panel-meta">
          {pipeline ? `${pipeline.month_label} 1–${pipeline.mtd_day}` : 'this month'} · by type
        </div>
      </div>

      {!pipeline && <div className="item-sub">Calendar data unavailable.</div>}

      {pipeline?.appts.map((a) => (
        <div className="appt" key={a.label}>
          <div className="appt-top">
            <span className="appt-name">{a.label}</span>
            <span className="appt-count num">{a.thisMonth}</span>
          </div>
          {/* dual bar: this month (solid) over avg marker */}
          <div className="appt-bar">
            <i className="appt-bar-fill" style={{ width: `${(a.thisMonth / maxVal) * 100}%` }} />
            <span
              className="appt-bar-avg"
              style={{ left: `${(a.avgMtd / maxVal) * 100}%` }}
              title={`avg ${a.avgMtd} by day ${pipeline.mtd_day} · ${a.avgMonthly}/mo full-month avg`}
            />
          </div>
          <div className="appt-meta">
            <DeltaBadge current={a.thisMonth} prior={a.lastMonth} label={pipeline.compare_label ?? pipeline.last_month_label} />
            <span className="appt-avg num" title={`${a.avgMonthly}/mo across completed months`}>
              {a.avgMtd} avg by day {pipeline.mtd_day}
            </span>
          </div>
        </div>
      ))}

      {pipeline && (
        <div className="appt-foot">
          <span className="appt-foot-cell">
            <span className="appt-foot-label">{pipeline.month_label} 1–{pipeline.mtd_day}</span>
            <b className="num">{pipeline.total_this_month}</b>
          </span>
          <span className="appt-foot-cell">
            <span className="appt-foot-label">{pipeline.compare_label ?? pipeline.last_month_label}</span>
            <b className="num" title={`${pipeline.total_last_month_full} in all of ${pipeline.last_month_label}`}>
              {pipeline.total_last_month}
            </b>
          </span>
          <span className="appt-foot-cell">
            <span className="appt-foot-label">Avg by day {pipeline.mtd_day}</span>
            <b className="num" title={`${pipeline.total_avg_monthly}/mo across completed months`}>
              {pipeline.total_avg_mtd}
            </b>
          </span>
        </div>
      )}
    </div>
  )
}

function ActionsPanel({ emails }: { emails: Email[] }) {
  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title">Prospect actions</div>
        <div className="panel-meta">PROSPECT label</div>
      </div>
      {emails.map((m, i) => (
        <div className="item" key={i}>
          <div className="item-top">
            <span className="item-name">{m.prospect}</span>
            {m.status === 'new' && <span className="chip chip-red">New</span>}
            {m.status === 'ready_to_send' && <span className="chip chip-gold">Ready</span>}
            {m.status === 'waiting_reply' && <span className="chip chip-gray">Waiting</span>}
          </div>
          <div className="item-sub">{m.subject}</div>
          <div className="item-age num">{m.days_ago === 0 ? 'Today' : `${m.days_ago}d ago`}</div>
        </div>
      ))}
      {emails.length === 0 && <div className="item-sub">No PROSPECT-labeled threads.</div>}
    </div>
  )
}

function BriefingPanel(props: {
  now: Date
  events: CalendarEvent[]
  emails: Email[]
  markets: MarketQuote[]
  news: NewsItem[]
  unread: UnreadMsg[]
  nextCall: (CalendarEvent & { at?: Date | null }) | null
  pipeline: PipelineData | null
}) {
  const { now, events, emails, markets, news, unread, nextCall, pipeline } = props

  const hour = now.getHours()
  const day = now.getDay()
  const isWeekend = day === 0 || day === 6

  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const period = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening'

  const todaysCalls = events.length
  const priorityCalls = events.filter(e => e.priority).length

  // Lede sentence
  const lede = (() => {
    if (todaysCalls === 0) {
      return isWeekend
        ? `${greeting}, Joshua. Quiet ${now.toLocaleDateString('en-US', { weekday: 'long' })} — board is clear.`
        : `${greeting}, Joshua. No calls on the board today.`
    }
    const callsWord = todaysCalls === 1 ? 'call' : 'calls'
    const priorityNote = priorityCalls > 0 ? `, ${priorityCalls} priority` : ''
    const nextNote = nextCall ? ` Next up: ${nextCall.time} with ${nextCall.prospect}.` : ''
    return `${greeting}, Joshua. ${todaysCalls} ${callsWord} on the board today${priorityNote}.${nextNote}`
  })()

  // 10-Yr Treasury commentary — relevant to FIA caps
  const tenYr = markets.find(m => m.label.toLowerCase().includes('10-yr'))
  const rateLine = tenYr ? (() => {
    const dir = tenYr.changePct >= 0 ? 'up' : 'down'
    const sense = tenYr.changePct >= 0.3 ? ' — favorable for FIA caps'
                : tenYr.changePct <= -0.3 ? ' — pressure on FIA caps'
                : ''
    return `10-Yr Treasury at ${tenYr.price.toFixed(2)}% (${dir} ${Math.abs(tenYr.changePct).toFixed(2)}%)${sense}.`
  })() : null

  // Inbox health
  const stale = emails.filter(m => m.status === 'waiting_reply' && m.days_ago >= 2)
  const inboxLine = (() => {
    const base = unread.length === 0 ? 'Inbox is clear'
               : unread.length <= 3 ? `${unread.length} unread thread${unread.length === 1 ? '' : 's'}`
               : `${unread.length} unread threads — heavier than usual`
    const tail = stale.length > 0 ? `; ${stale.length} aging follow-up${stale.length === 1 ? '' : 's'}` : ''
    return `${base}${tail}.`
  })()

  // Email summaries for display
  const emailsToShow = unread.slice(0, 5)

  // Today's focus list
  type Focus = { tag: string; tagClass: string; text: string }
  const focus: Focus[] = []
  events.filter(e => e.priority).forEach(e => {
    focus.push({ tag: 'Close op', tagClass: 'tag-red', text: `${e.time} — ${e.type} with ${e.prospect}` })
  })
  emails.filter(m => m.status === 'ready_to_send').forEach(m => {
    focus.push({ tag: 'Send', tagClass: 'tag-gold', text: `${m.subject} → ${m.prospect}` })
  })
  stale.forEach(m => {
    focus.push({ tag: 'Nudge', tagClass: 'tag-default', text: `${m.prospect} — waiting ${m.days_ago}d on "${m.subject}"` })
  })
  events.filter(e => !e.priority).forEach(e => {
    focus.push({ tag: 'Prep', tagClass: 'tag-default', text: `${e.time} — ${e.prospect} (${e.stage})` })
  })

  return (
    <section className="briefing reveal">
      <div className="briefing-head">
        <div className="briefing-title">{period} briefing</div>
        <div className="briefing-date">
          {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
      </div>

      <p className="briefing-lede">{lede}</p>

      <div className="briefing-grid">
        <div className="briefing-col">
          <div className="briefing-col-title">At a glance</div>
          <ul className="briefing-list">
            {pipeline && (
              <li>
                <b className="num">{pipeline.total_this_month}</b> appointments in {pipeline.month_label} through day {pipeline.mtd_day} ·{' '}
                {pipeline.total_this_month >= pipeline.total_last_month
                  ? <span className="up-text">▲ {pipeline.total_this_month - pipeline.total_last_month} vs {pipeline.compare_label ?? pipeline.last_month_label}</span>
                  : <span className="down-text">▼ {pipeline.total_last_month - pipeline.total_this_month} vs {pipeline.compare_label ?? pipeline.last_month_label}</span>
                } · <b className="num">{pipeline.total_avg_mtd}</b> avg by this point
              </li>
            )}
            {rateLine && <li>{rateLine}</li>}
            {news[0] && (
              <li>
                Top federal news:&nbsp;
                <a href={news[0].link} target="_blank" rel="noopener noreferrer" className="briefing-link">
                  {news[0].title}
                </a>
              </li>
            )}
            {news[1] && (
              <li>
                <a href={news[1].link} target="_blank" rel="noopener noreferrer" className="briefing-link">
                  {news[1].title}
                </a>
              </li>
            )}
          </ul>
        </div>

        <div className="briefing-col">
          <div className="briefing-col-title">Today's focus</div>
          {focus.length === 0 ? (
            <div className="briefing-empty">Board is clear — good window to prospect or prep.</div>
          ) : (
            <ul className="briefing-focus">
              {focus.slice(0, 6).map((f, i) => (
                <li key={i}>
                  <span className={`briefing-tag ${f.tagClass}`}>{f.tag}</span>
                  <span>{f.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Inbox section */}
      <div className="briefing-inbox">
        <div className="briefing-col-title">
          Inbox&nbsp;
          <span className="briefing-inbox-count">
            {unread.length === 0 ? 'clear' : `${unread.length} unread`}
            {stale.length > 0 ? ` · ${stale.length} aging follow-up${stale.length === 1 ? '' : 's'}` : ''}
          </span>
        </div>
        {emailsToShow.length === 0 ? (
          <div className="briefing-empty">No unread messages in the last 3 days.</div>
        ) : (
          <ul className="briefing-email-list">
            {emailsToShow.map((m: any, i: number) => (
              <li key={i} className="briefing-email-item">
                <div className="briefing-email-meta">
                  <span className="briefing-email-from">{m.from}</span>
                  <span className="briefing-email-age">{m.hoursAgo != null ? (m.hoursAgo < 1 ? 'just now' : m.hoursAgo < 24 ? `${m.hoursAgo}h ago` : `${Math.floor(m.hoursAgo / 24)}d ago`) : ''}</span>
                </div>
                <div className="briefing-email-subject">{m.subject}</div>
                {m.snippet && <div className="briefing-email-snippet">{m.snippet}</div>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function PlanPanel({ events, emails }: { events: CalendarEvent[]; emails: Email[] }) {
  const plan = useMemo(() => {
    const out: { strong: string; rest: string }[] = []
    events.filter(e => e.priority).forEach(e => {
      out.push({ strong: `${e.time} — ${e.type}`, rest: ` with ${e.prospect}. Primary close opportunity: confirm age 59.5+ before any rollover talk.` })
    })
    emails.filter(m => m.status === 'ready_to_send').forEach(m => {
      out.push({ strong: 'Send:', rest: ` ${m.subject} → ${m.prospect}` })
    })
    emails.filter(m => m.status === 'waiting_reply' && m.days_ago >= 2).forEach(m => {
      out.push({ strong: 'Nudge:', rest: ` ${m.prospect} — waiting ${m.days_ago} days on "${m.subject}"` })
    })
    events.filter(e => !e.priority).forEach(e => {
      out.push({ strong: `${e.time} — ${e.type}`, rest: ` with ${e.prospect}. Prep file and FEHB/TSP history beforehand.` })
    })
    return out.slice(0, 6)
  }, [events, emails])

  if (plan.length === 0) return null
  return (
    <section className="panel plan">
      <div className="panel-head">
        <div className="panel-title">Daily action plan</div>
        <div className="panel-meta">built from today's board</div>
      </div>
      <ul>
        {plan.map((p, i) => (
          <li key={i}><span><b>{p.strong}</b>{p.rest}</span></li>
        ))}
      </ul>
    </section>
  )
}

/* ============================================================
   Client-facing live meeting screen  (?view=client)
   ============================================================ */
function ClientScreen({ now, onExit }: { now: Date; onExit: () => void }) {
  const clock = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  const dateLine = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div className="client">
      <StarsField count={70} />

      <div className="wrap">
        <div className="c-top">
          <div className="c-brand-row">
            <FebaSeal size={64} variant="light" />
            <div className="c-brand-text">
              <div className="c-brand-main">Federal Employee Benefit Advisors</div>
              <div className="c-brand-sub">Specialists in federal retirement planning</div>
            </div>
          </div>
          <div className="c-clock">
            <div className="live"><i />Live meeting</div>
            <div className="c-clock-time num">{clock}</div>
            <div className="c-clock-date">{dateLine}</div>
          </div>
        </div>

        <div className="c-hero">
          <WavingFlag width={210} />
          <div className="c-eyebrow">Your federal retirement review</div>
          <h1 className="c-headline">
            A clear picture of your <em>federal benefits</em> — reviewed together, live.
          </h1>
          <p className="c-lede">
            Everything we cover today is built around your FERS pension, TSP, FEHB, and
            FEGLI elections — explained in plain English, with the math on screen.
          </p>

          <div className="c-divider">
            <span className="c-divider-star">★</span>
            <span className="c-divider-star">★</span>
            <span className="c-divider-star">★</span>
          </div>
        </div>

        <div className="c-cols">
          <div className="c-card">
            <div className="c-card-title">Today's agenda</div>
            <ol className="agenda">
              <li><span><strong>Where you stand</strong><small>FERS pension estimate, TSP balance, and your service timeline</small></span></li>
              <li><span><strong>Your benefits in review</strong><small>FEHB five-year rule, FEGLI coverage, and survivor elections</small></span></li>
              <li><span><strong>Income &amp; RMD planning</strong><small>Sequencing withdrawals across TSP, IRA, and Social Security</small></span></li>
              <li><span><strong>Tax-smart strategy</strong><small>Coordinating brackets, timing, and required distributions</small></span></li>
              <li><span><strong>Your questions &amp; next steps</strong><small>Action items, timelines, and what we'll prepare for you</small></span></li>
            </ol>
          </div>

          <div className="c-card with-blue">
            <div className="c-advisor">
              <div className="c-avatar">JS</div>
              <div>
                <div className="c-advisor-name">Joshua Scott</div>
                <div className="c-advisor-role">Advisor · Federal Retirement Consultant℠</div>
              </div>
            </div>
            <div className="c-card-title">Why you're in good hands</div>
            <div className="cred">
              <div className="cred-row">
                <span className="cred-mark">★</span>
                <div>
                  <div className="cred-name">Fiduciary advisor</div>
                  <div className="cred-sub">Legally bound to act in your best interest</div>
                </div>
              </div>
              <div className="cred-row">
                <span className="cred-mark">★</span>
                <div>
                  <div className="cred-name">Federal Retirement Consultant℠</div>
                  <div className="cred-sub">FRC℠ #1515 — specialized in FERS, TSP, FEHB &amp; FEGLI</div>
                </div>
              </div>
              <div className="cred-row">
                <span className="cred-mark">★</span>
                <div>
                  <div className="cred-name">Investment Adviser Representative</div>
                  <div className="cred-sub">SEC IAR #8205318 — under Fortress Financial</div>
                </div>
              </div>
              <div className="cred-row">
                <span className="cred-mark">★</span>
                <div>
                  <div className="cred-name">Licensed in all 50 states</div>
                  <div className="cred-sub">Insurance-licensed nationwide · NPN 20505797</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="c-foot">
          <CapitolSilhouette />
          <div className="c-foot-meta">
            <div className="stars-row">★ ★ ★ ★ ★ ★ ★ ★ ★ ★ ★ ★ ★</div>
            <div>Federal Employee Benefit Advisors</div>
            <div>myfeba.org · Specialists in federal retirement</div>
          </div>
          <button className="c-exit" onClick={onExit}>Advisor sign-in</button>
        </div>
      </div>
    </div>
  )
}



/* ============================================================
   Commission Tracker Panel
   ============================================================ */

const COMMISSION_DEALS = [
  { name:'Joseph Walker',     datePaid:'2026-01-22', status:'Paid',      submitted:500000,  commission:20000    },
  { name:'Michelle McCluer',  datePaid:'2026-02-24', status:'Paid',      submitted:287000,  commission:11480    },
  { name:'Norma Canales',     datePaid:'2026-03-01', status:'Paid',      submitted:100000,  commission:4000     },
  { name:'Velma Ivey',        datePaid:'2026-03-15', status:'Paid',      submitted:300000,  commission:12000    },
  { name:'Thomas Crumplar',   datePaid:'2026-03-16', status:'Paid',      submitted:85000,   commission:3400     },
  { name:'Janell Baylor',     datePaid:'2026-03-24', status:'Paid',      submitted:100000,  commission:4000     },
  { name:'Mary Robinson',     datePaid:'2026-05-15', status:'Paid',      submitted:100000,  commission:4000     },
  { name:'Lynne Milewski',    datePaid:'2026-05-15', status:'Paid',      submitted:70000,   commission:2800     },
  { name:'Yvette Dewar',      datePaid:'2026-05-15', status:'Paid',      submitted:160000,  commission:6400     },
  { name:'Donna Spry',        datePaid:'2026-05-29', status:'Paid',      submitted:151268,  commission:6050.72  },
  { name:'Carmen Bentley',    datePaid:'2026-06-12', status:'Paid',      submitted:70000,   commission:6400     },
  { name:'Daryl Bedford',     datePaid:'2026-06-26', status:'Paid',      submitted:315000,  commission:12600    },
  { name:'Alfonso Clavijo',   datePaid:'2026-07-03', status:'Paid',      submitted:150000,  commission:6000     },
  { name:'Judith Allen-Close',datePaid:'2026-07-17', status:'Paid',      submitted:500000,  commission:20000    },
  { name:'Gary Hinshaw',      datePaid:null,         status:'Scheduled', submitted:300000,  commission:12000    },
  { name:'Umsha',             datePaid:null,         status:'Scheduled', submitted:50000,   commission:2000     },
  { name:'Lisa Talbot',       datePaid:null,         status:'Scheduled', submitted:600000,  commission:24000    },
  { name:'Carla Williams',    datePaid:null,         status:'Scheduled', submitted:180000,  commission:7200     },
  { name:'Terri Guthrie',     datePaid:null,         status:'Scheduled', submitted:50000,   commission:2000     },
  { name:'Al Hoppe',          datePaid:null,         status:'Scheduled', submitted:500000,  commission:20000    },
  { name:'Ron Homen',         datePaid:null,         status:'Scheduled', submitted:500000,  commission:20000    },
]

const BLUE_CLIENTS_58 = [
  'Mark Halter','Tina Bonner','Yuliang Liu','Quinton Wong','Vernellia Johnson',
  'Walter Rodriguez','Joselito Ignacio','Mark Abowd','Sarah Sebban','Ezron Cooke',
  'Allan Manco','Rafel Jackson','JD Smith','John Wright','Tammi La Tourette',
  'Lisa Ellis','Phelesa Guy','Sheila Taeza','Shirlene Campbell','Wendy Cobb',
  'Linda Matthews','Julia McGinn-Rodriguez','Russell Saylor','Maureen Vance',
  'Tina Washington','William Mines','Jennifer Mikolic','Brett Troia','Afolake Sulola',
  'Victor Herod','Ernesto Santana','Anthony Lundy','Karim Asqiriba','Stanley Marquez',
  'Joseph Burk','Diane Yenzer','Omar Ramirez','Cinthya Cunningham','Shawn Wallace',
  'Adebola Ajao','Gloria Curry','Jason & Pauline',
]

function CommissionTracker() {
  const [filter, setFilter] = useState<'all' | 'paid' | 'scheduled'>('all')
  const GOAL = 10000000
  const paid = COMMISSION_DEALS.filter(d => d.status === 'Paid')
  const sched = COMMISSION_DEALS.filter(d => d.status === 'Scheduled')
  const paidSub   = paid.reduce((a,b)=>a+b.submitted,0)
  const totalSub  = COMMISSION_DEALS.reduce((a,b)=>a+b.submitted,0)
  const totalComm = COMMISSION_DEALS.reduce((a,b)=>a+b.commission,0)
  const paidComm  = paid.reduce((a,b)=>a+b.commission,0)
  const pendComm  = sched.reduce((a,b)=>a+b.commission,0)
  const pct       = (paidSub / GOAL) * 100
  const fmt = (v: number) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(v)
  const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '—'
  const rows = filter === 'all' ? COMMISSION_DEALS : filter === 'paid' ? paid : sched
  return (
    <section className="panel reveal" style={{animationDelay:'0.22s'}}>
      <div className="panel-head">
        <div className="panel-title">Commission tracker — 2026</div>
        <div className="panel-meta num">Goal: {fmt(GOAL)}</div>
      </div>
      <div className="comm-stats">
        <div className="comm-stat"><div className="comm-stat-label">Total submitted</div><div className="comm-stat-val num">{fmt(totalSub)}</div></div>
        <div className="comm-stat"><div className="comm-stat-label">Paid commission</div><div className="comm-stat-val num gold">{fmt(paidComm)}</div></div>
        <div className="comm-stat"><div className="comm-stat-label">Pending commission</div><div className="comm-stat-val num">{fmt(pendComm)}</div></div>
        <div className="comm-stat"><div className="comm-stat-label">Total commission</div><div className="comm-stat-val num">{fmt(totalComm)}</div></div>
      </div>
      <div className="comm-progress">
        <div className="comm-progress-header"><span>Paid submitted vs $10M goal</span><span className="num gold">{pct.toFixed(1)}%</span></div>
        <div className="comm-bar-outer"><div className="comm-bar-inner" style={{width:`${Math.min(pct,100)}%`}} /></div>
        <div className="comm-progress-footer"><span className="num">{fmt(paidSub)} paid</span><span>{fmt(GOAL - paidSub)} remaining</span></div>
      </div>
      <div className="comm-tabs">
        {(['all','paid','scheduled'] as const).map(t => (
          <button key={t} className={`comm-tab${filter===t?' on':''}`} onClick={()=>setFilter(t)}>
            {t.charAt(0).toUpperCase()+t.slice(1)} ({t==='all'?COMMISSION_DEALS.length:t==='paid'?paid.length:sched.length})
          </button>
        ))}
      </div>
      <div className="comm-table-wrap">
        <table className="comm-table">
          <thead><tr><th>Client</th><th>Status</th><th>Submitted</th><th>Commission</th><th>Date paid</th></tr></thead>
          <tbody>
            {rows.map((d,i) => (
              <tr key={i}>
                <td><strong>{d.name}</strong></td>
                <td><span className={`chip ${d.status==='Paid'?'chip-green-sm':'chip-blue-sm'}`}>{d.status}</span></td>
                <td className="num">{fmt(d.submitted)}</td>
                <td className="num">{fmt(d.commission)}</td>
                <td className="num dim">{fmtDate(d.datePaid)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function AgeEligibilityTracker() {
  const GREEN_SAMPLE = [
    'Gloria Oshegbo','Richard Vorperian','Brandie Cockrell','Cary Greene','ML Beerman',
    'Terrence Grady','Pam Robinson','Abdo Zacheus','Janet Muller','Jill Thomas',
    'Ian Retterer','Darla Curtis','Angela Moore','Jermaine Davis','Sherri Boisvert',
    'Beth Hollenbeck','Timothy Alford','Alexander Robinson','Stacy Cunningham',
    'Beatrice Buckingham','Velma Thornton Ivey','Aaron Martinez','Grace Morrell',
    'Tessa Corsetti','William Carr','Thomas Crumplar','Terri Guthrie','Susan Garcia',
    'Lynne Antosiak','George Rasmussen','Nadine Baldonado','Gloria Gonzalez',
    'Tammy Moore','Grace Norwood','James Fields','William Rincon','Maureen Madison',
  ]
  return (
    <section className="panel reveal" style={{animationDelay:'0.26s'}}>
      <div className="panel-head">
        <div className="panel-title">Rollover eligibility tracker</div>
        <div className="panel-meta">Live from Google Calendar · color-coded</div>
      </div>
      <div className="age-legend">
        <span className="age-legend-item"><span className="age-dot-green-inline" />Green (Basil) = 59+ — rollover eligible</span>
        <span className="age-legend-item"><span className="age-dot-blue-inline" />Blue (Blueberry) = 58 &amp; under — not yet</span>
      </div>
      <div className="age-panels">
        <div className="age-panel age-green-panel">
          <div className="age-panel-hdr"><span className="age-dot-green-inline" /><span>59+ — Eligible</span></div>
          <div className="age-big-num age-green-num">468</div>
          <div className="age-panel-sub">unique clients · green calendar events</div>
          <div className="age-chip-wrap">
            {GREEN_SAMPLE.map((n,i)=><span key={i} className="age-chip age-chip-green">{n}</span>)}
            <span className="age-chip age-chip-green-more">+431 more</span>
          </div>
        </div>
        <div className="age-panel age-blue-panel">
          <div className="age-panel-hdr"><span className="age-dot-blue-inline" /><span>58 &amp; Under — Not Yet</span></div>
          <div className="age-big-num age-blue-num">43</div>
          <div className="age-panel-sub">unique clients · blue calendar events</div>
          <div className="age-chip-wrap">
            {BLUE_CLIENTS_58.map((n,i)=><span key={i} className="age-chip age-chip-blue">{n}</span>)}
          </div>
        </div>
      </div>
      <div className="age-note">Scanned 1,463 calendar events. Green = colorId 10 (Basil). Blue = colorId 9 (Blueberry). Update event colors in Google Calendar to keep current. Cannot facilitate rollover until age 59½.</div>
    </section>
  )
}

/* ============================================================
   Sample fallback data (shown only if APIs are unreachable)
   ============================================================ */
const SAMPLE_EVENTS: CalendarEvent[] = [
  { time: '10:00 AM', type: 'FIA Performance Report', prospect: 'Smith Federal Employees', stage: 'PRC', priority: true },
  { time: '2:30 PM', type: 'Initial Consult', prospect: 'Johnson Family Rollover', stage: 'Initial Consult', priority: false },
  { time: '4:00 PM', type: 'Follow-up A/B', prospect: 'Davis TSP Question', stage: 'Follow Up', priority: true }
]

const SAMPLE_EMAILS: Email[] = [
  { prospect: 'Fed Benefits Inc', subject: 'FIA performance report ready', status: 'ready_to_send', days_ago: 0 },
  { prospect: 'FERS Specialist LLC', subject: 'TSP rollover & LEO benefits', status: 'waiting_reply', days_ago: 2 },
  { prospect: 'Treasury Employee CU', subject: 'FEHB 5-yr rule compliance', status: 'new', days_ago: 0 }
]

const SAMPLE_PIPELINE: PipelineData = {
  appts: [
    { label: 'Initial Consult', thisMonth: 6, lastMonth: 4, lastMonthFull: 7, avgMonthly: 5.2, avgMtd: 2.6, ytdTotal: 31 },
    { label: 'Performance Report', thisMonth: 3, lastMonth: 2, lastMonthFull: 5, avgMonthly: 3.8, avgMtd: 1.9, ytdTotal: 23 },
    { label: 'Follow Up', thisMonth: 4, lastMonth: 1, lastMonthFull: 3, avgMonthly: 3.4, avgMtd: 1.7, ytdTotal: 20 },
    { label: 'Account Setup', thisMonth: 2, lastMonth: 1, lastMonthFull: 1, avgMonthly: 1.6, avgMtd: 0.8, ytdTotal: 10 }
  ],
  total_this_month: 15,
  total_last_month: 8,
  total_last_month_full: 16,
  total_avg_monthly: 14.0,
  total_avg_mtd: 7.0,
  busiest_type: 'Initial Consult',
  month_label: 'June',
  last_month_label: 'May',
  compare_label: 'May 1–15',
  mtd_day: 15
}

const SAMPLE_TSP: TspFund[] = [
  { label: 'G Fund', price: 18.92, change: 0.01, changePct: 0.05, ytdPct: 2.31 },
  { label: 'F Fund', price: 20.14, change: 0.08, changePct: 0.40, ytdPct: 3.12 },
  { label: 'C Fund', price: 92.46, change: 0.51, changePct: 0.55, ytdPct: 8.44 },
  { label: 'S Fund', price: 88.73, change: -0.32, changePct: -0.36, ytdPct: 5.07 },
  { label: 'I Fund', price: 45.18, change: 0.22, changePct: 0.49, ytdPct: 9.86 }
]
