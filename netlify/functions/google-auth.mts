/**
 * Shared Google OAuth token utility.
 *
 * Priority order:
 *   1. Try GOOGLE_ACCESS_TOKEN / GMAIL_ACCESS_TOKEN as a quick-start shortcut
 *      (used on first invocation or after a manual refresh)
 *   2. If that returns 401, auto-refresh using:
 *        GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET + GOOGLE_REFRESH_TOKEN
 *
 * Once you have your own OAuth client set up in Google Cloud Console and
 * GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN are set
 * as Netlify env vars, the dashboard will NEVER expire again — the refresh
 * token is long-lived and the utility handles rotation automatically.
 */

const TOKEN_URL = 'https://oauth2.googleapis.com/token'

/** In-memory cache so we don't refresh on every invocation within the same warm instance */
let cached: { token: string; expiresAt: number } | null = null

export async function getGoogleToken(): Promise<string> {
  // 1. Return in-memory cached token if still valid (5-min buffer)
  if (cached && Date.now() < cached.expiresAt - 300_000) {
    return cached.token
  }

  const clientId     = Netlify.env.get('GOOGLE_CLIENT_ID')
  const clientSecret = Netlify.env.get('GOOGLE_CLIENT_SECRET')
  const refreshToken = Netlify.env.get('GOOGLE_REFRESH_TOKEN')

  // 2. If we have a full OAuth client config, use the refresh token to get a
  //    fresh access token. This is the permanent solution — never expires.
  if (clientId && clientSecret && refreshToken) {
    const params = new URLSearchParams({
      client_id:     clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type:    'refresh_token'
    })

    const res = await fetch(TOKEN_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    params.toString()
    })

    if (res.ok) {
      const data = await res.json()
      if (data.access_token) {
        cached = {
          token:     data.access_token,
          expiresAt: Date.now() + (data.expires_in || 3600) * 1000
        }
        return cached.token
      }
      console.warn('Token refresh failed:', data.error, data.error_description)
    } else {
      console.warn('Token refresh HTTP error:', res.status)
    }
  }

  // 3. Fall back to the stored short-lived token (works for ~1 hour after manual refresh)
  const stored = Netlify.env.get('GOOGLE_ACCESS_TOKEN') || Netlify.env.get('GMAIL_ACCESS_TOKEN')
  if (stored) return stored

  throw new Error('no_google_token')
}
