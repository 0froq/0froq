// Renders assets/now-{light,dark}.svg from the public activity.json froq.me reads.
//   Locally: node scripts/now.mjs
//   Action:  .github/workflows/now.yml (every 20 minutes, or Actions tab > "now" > Run workflow)
// Sleeping rule mirrors froq.me (app/utils/activity.ts): a missing/invalid timestamp,
// or one older than 5 minutes, is sleeping, whatever `active` says.
// README.md is not touched.
import { mkdirSync, writeFileSync } from 'node:fs'

const URL = process.env.ACTIVITY_URL || 'https://pub-d05ff6ec0ecf448ca7cc6c2f0c0a5bcc.r2.dev/activity.json'
const STALE_MS = 5 * 60 * 1000
const MAX_CHARS = 56

const THEMES = {
  light: { ink: '#1d1d1a', accent: '#a83429', muted: '#5c5a54' },
  dark: { ink: '#ece7dc', accent: '#7ea3d9', muted: '#9c968c' },
}

const SERIF = `Georgia, 'Iowan Old Style', Palatino, 'Palatino Linotype', 'Songti SC', 'Noto Serif CJK SC', 'Times New Roman', serif`

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function clip(s) {
  const chars = Array.from(s.replace(/\s+/g, ' ').trim())
  return chars.length > MAX_CHARS ? `${chars.slice(0, MAX_CHARS - 1).join('')}…` : chars.join('')
}

function text(value) {
  return typeof value === 'string' && value.trim() ? clip(value) : ''
}

async function fetchActivity() {
  try {
    const res = await fetch(URL, { headers: { 'Cache-Control': 'no-cache' } })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

function describe(activity, now = Date.now()) {
  const stamp = activity && typeof activity.timestamp === 'string' ? new Date(activity.timestamp).getTime() : NaN
  const sleeping = !activity || Number.isNaN(stamp) || now - stamp > STALE_MS
  const app = text(activity?.process?.name)
  if (sleeping || activity.active === false) return { sleeping: true, app }
  const title = text(activity.media?.title)
  const artist = text(activity.media?.artist)
  const media = title ? (artist ? `${title} – ${artist}` : title) : ''
  return { sleeping: false, app, media }
}

function render(state, t) {
  let body
  let label
  if (state.sleeping) {
    label = state.app ? `在 ${state.app} 中眠了` : '眠了'
    body = `<tspan fill="${t.muted}" font-style="italic">${esc(label)}</tspan>`
  } else {
    const app = state.app || '…'
    label = `正在 ${app}${state.media ? ` · ${state.media}` : ''}`
    body =
      `<tspan fill="${t.accent}">正在</tspan><tspan fill="${t.ink}"> ${esc(app)}</tspan>` +
      (state.media ? `<tspan fill="${t.muted}"> · ${esc(state.media)}</tspan>` : '')
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="28" viewBox="0 0 640 28" role="img" aria-label="${esc(label)}">
  <title>${esc(label)}</title>
  <text x="0" y="18" font-family="${SERIF}" font-size="13">${body}</text>
</svg>
`
}

const state = describe(await fetchActivity())
mkdirSync('assets', { recursive: true })
for (const [name, theme] of Object.entries(THEMES)) writeFileSync(`assets/now-${name}.svg`, render(state, theme))
console.log(state.sleeping ? `sleeping${state.app ? ` (${state.app})` : ''}` : `active: ${state.app}${state.media ? ` · ${state.media}` : ''}`)
