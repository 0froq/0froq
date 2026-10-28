import { writeFileSync, mkdirSync } from 'node:fs'

const USER = process.env.PROFILE_USER || '0froq'
const TOKEN = process.env.STATS_TOKEN || process.env.GITHUB_TOKEN
if (!TOKEN) throw new Error('Set GITHUB_TOKEN (or STATS_TOKEN) to query the GitHub GraphQL API')

const THEMES = {
  light: { paper: '#fff8e8', ink: '#1d1d1a', accent: '#a83429' },
  dark: { paper: '#1e1d19', ink: '#ece7dc', accent: '#7ea3d9' },
}

async function gql(query, variables) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${TOKEN}`, 'Content-Type': 'application/json', 'User-Agent': 'profile-stats' },
    body: JSON.stringify({ query, variables }),
  })
  const json = await res.json()
  if (!res.ok || json.errors) throw new Error(JSON.stringify(json.errors || json))
  return json.data
}

const day = (d) => d.toISOString().slice(0, 10)

async function fetchDays() {
  const { user } = await gql('query($u:String!){user(login:$u){createdAt}}', { u: USER })
  const start = new Date(user.createdAt).getUTCFullYear()
  const end = new Date().getUTCFullYear()
  const days = new Map()
  for (let y = start; y <= end; y++) {
    const from = new Date(Date.UTC(y, 0, 1))
    const to = y === end ? new Date() : new Date(Date.UTC(y, 11, 31, 23, 59, 59))
    const data = await gql(
      `query($u:String!,$from:DateTime!,$to:DateTime!){user(login:$u){contributionsCollection(from:$from,to:$to){contributionCalendar{weeks{contributionDays{date contributionCount}}}}}}`,
      { u: USER, from: from.toISOString(), to: to.toISOString() },
    )
    for (const w of data.user.contributionsCollection.contributionCalendar.weeks)
      for (const d of w.contributionDays) days.set(d.date, d.contributionCount)
  }
  return days
}

function compute(days) {
  const today = day(new Date())
  const dates = [...days.keys()].filter((d) => d <= today).sort()
  let longest = 0
  let run = 0
  for (const d of dates) {
    run = days.get(d) > 0 ? run + 1 : 0
    longest = Math.max(longest, run)
  }
  let current = 0
  const cursor = new Date(today + 'T00:00:00Z')
  if (!(days.get(today) > 0)) cursor.setUTCDate(cursor.getUTCDate() - 1)
  while (days.get(day(cursor)) > 0) {
    current++
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  const yearAgo = new Date(today + 'T00:00:00Z')
  yearAgo.setUTCDate(yearAgo.getUTCDate() - 364)
  const window = dates.filter((d) => d >= day(yearAgo))
  const total = window.reduce((s, d) => s + days.get(d), 0)
  return { total, current, longest, window }
}

function level(n, max) {
  if (n <= 0) return 0
  const r = n / max
  return r > 0.75 ? 4 : r > 0.5 ? 3 : r > 0.25 ? 2 : 1
}

function render(stats, days, t) {
  const W = 720
  const H = 220
  const pad = 32
  const serif = `'EB Garamond', Garamond, Georgia, 'Times New Roman', serif`
  const mono = `'DM Mono', ui-monospace, SFMono-Regular, Menlo, monospace`
  const cols = [
    ['contributions', stats.total.toLocaleString('en-US'), 'past year'],
    ['current streak', String(stats.current), stats.current === 1 ? 'day' : 'days'],
    ['longest streak', String(stats.longest), stats.longest === 1 ? 'day' : 'days'],
  ]
  const colW = (W - pad * 2) / 3
  const max = Math.max(1, ...stats.window.map((d) => days.get(d)))
  const firstDow = new Date(stats.window[0] + 'T00:00:00Z').getUTCDay()
  const cell = 9
  const gap = 3
  const gridW = 53 * (cell + gap) - gap
  const gx = (W - gridW) / 2
  const gy = 134

  let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${USER} GitHub contributions: ${stats.total} in the past year, current streak ${stats.current} days, longest streak ${stats.longest} days">\n`
  out += `<rect width="${W}" height="${H}" rx="2" fill="${t.paper}"/>\n`
  out += `<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="2" fill="none" stroke="${t.ink}" stroke-opacity="0.25"/>\n`
  cols.forEach(([label, value, unit], i) => {
    const x = pad + i * colW
    if (i > 0) out += `<line x1="${x - 12}" y1="34" x2="${x - 12}" y2="104" stroke="${t.ink}" stroke-opacity="0.2"/>\n`
    out += `<text x="${x}" y="40" font-family="${mono}" font-size="11" letter-spacing="1" fill="${t.ink}" fill-opacity="0.6">${label.toUpperCase()}</text>\n`
    out += `<text x="${x}" y="88" font-family="${serif}" font-size="48" fill="${i === 0 ? t.accent : t.ink}">${value}</text>\n`
    out += `<text x="${x}" y="108" font-family="${serif}" font-style="italic" font-size="15" fill="${t.ink}" fill-opacity="0.6">${unit}</text>\n`
  })
  out += `<line x1="${pad}" y1="122" x2="${W - pad}" y2="122" stroke="${t.ink}" stroke-opacity="0.2"/>\n`
  stats.window.forEach((d, i) => {
    const idx = i + firstDow
    const wk = Math.floor(idx / 7)
    const dow = idx % 7
    const lv = level(days.get(d), max)
    const x = gx + wk * (cell + gap)
    const y = gy + dow * (cell + gap) - 4
    if (lv === 0) out += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="1" fill="${t.ink}" fill-opacity="0.07"/>\n`
    else out += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="1" fill="${t.accent}" fill-opacity="${[0, 0.3, 0.5, 0.75, 1][lv]}"/>\n`
  })
  out += `</svg>\n`
  return out
}

const days = await fetchDays()
const stats = compute(days)
mkdirSync('assets', { recursive: true })
for (const [name, theme] of Object.entries(THEMES)) writeFileSync(`assets/stats-${name}.svg`, render(stats, days, theme))
console.log(`${USER}: ${stats.total} contributions, streak ${stats.current}, longest ${stats.longest}`)
