import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const USER = process.env.PROFILE_USER || '0froq'
const TOKEN = process.env.STATS_TOKEN || process.env.GITHUB_TOKEN
if (!TOKEN) throw new Error('Set GITHUB_TOKEN (or STATS_TOKEN) to query the GitHub GraphQL API')

const THEMES = {
  light: { paper: '#fff8e8', ink: '#1d1d1a', accent: '#a83429' },
  dark: { paper: '#1e1d19', ink: '#ece7dc', accent: '#7ea3d9' },
}

const SERIF = `Georgia, 'Iowan Old Style', Palatino, 'Palatino Linotype', 'Times New Roman', serif`

async function gql(query, variables) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'profile-stats',
    },
    body: JSON.stringify({ query, variables }),
  })
  const json = await res.json()
  if (!res.ok || json.errors) throw new Error(JSON.stringify(json.errors || json))
  return json.data
}

async function fetchTotal() {
  const data = await gql(
    `query($u:String!){user(login:$u){contributionsCollection{contributionCalendar{totalContributions}}}}`,
    { u: USER },
  )
  return data.user.contributionsCollection.contributionCalendar.totalContributions
}

function render(total, t) {
  const label = `${total.toLocaleString('en-US')} contributions in the past year`
  const W = 640
  const H = 124
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}">
  <title>${label}</title>
  <rect width="${W}" height="${H}" fill="${t.paper}"/>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" fill="none" stroke="${t.ink}" stroke-opacity="0.28"/>
  <line x1="304" y1="28" x2="336" y2="28" stroke="${t.accent}" stroke-width="1"/>
  <text x="320" y="74" text-anchor="middle" font-family="${SERIF}" font-size="40" fill="${t.accent}">${total.toLocaleString('en-US')}</text>
  <text x="320" y="98" text-anchor="middle" font-family="${SERIF}" font-style="italic" font-size="15" fill="${t.ink}" fill-opacity="0.62">contributions in the past year</text>
</svg>
`
}

const total = await fetchTotal()
const label = `${total.toLocaleString('en-US')} contributions in the past year`
mkdirSync('assets', { recursive: true })
for (const [name, theme] of Object.entries(THEMES)) writeFileSync(`assets/stats-${name}.svg`, render(total, theme))

const readmePath = 'README.md'
const readme = readFileSync(readmePath, 'utf8')
const next = readme.replace(
  /(<img alt=")[^"]*(" src="assets\/stats-light\.svg")/,
  `$1${label}$2`,
)
if (next === readme) throw new Error('README.md is missing the stats image alt this script updates')
writeFileSync(readmePath, next)
console.log(`${USER}: ${label}`)
