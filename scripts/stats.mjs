import { readFileSync, writeFileSync } from 'node:fs'

const USER = process.env.PROFILE_USER || '0froq'
const TOKEN = process.env.STATS_TOKEN || process.env.GITHUB_TOKEN
if (!TOKEN) throw new Error('Set GITHUB_TOKEN (or STATS_TOKEN) to query the GitHub GraphQL API')

const THEMES = {
  light: { ink: '#1d1d1a', accent: '#a83429', muted: '#5c5a54' },
  dark: { ink: '#ece7dc', accent: '#7ea3d9', muted: '#9c968c' },
}

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

function glyphId(prefix, size, ch) {
  return `${prefix}_${size}_${ch.codePointAt(0).toString(16)}`
}

function layoutUses(chars, startX, y) {
  let x = startX
  const uses = []
  for (const rec of chars) {
    if (rec.id) {
      uses.push(
        `    <use href="#${rec.id}" xlink:href="#${rec.id}" x="${Number(x.toFixed(1))}" y="${y}"/>`,
      )
    }
    x += rec.adv
  }
  return uses.join('\n')
}

function patchStack(svg, total, theme) {
  const found = svg.match(/<!--contrib-metrics ({.*})-->/)
  if (!found) throw new Error('stack SVG is missing contrib-metrics')
  const metrics = JSON.parse(found[1])
  const num = total.toLocaleString('en-US')
  const numChars = [...num].map((ch) => {
    const adv = metrics.adv[ch]
    if (adv == null) throw new Error(`no advance for ${JSON.stringify(ch)}`)
    return { id: glyphId(metrics.prefix, metrics.size, ch), adv }
  })
  let x = metrics.x
  const numUses = layoutUses(numChars, x, metrics.y)
  x += numChars.reduce((sum, rec) => sum + rec.adv, 0)
  const restUses = layoutUses(metrics.rest, x, metrics.y)
  const label = `${num} contributions in the past year`
  const next = svg
    .replace(
      /<g id="contrib-num"[^>]*>[\s\S]*?<\/g>/,
      `<g id="contrib-num" fill="${theme.accent}" fill-rule="nonzero">\n${numUses}\n  </g>`,
    )
    .replace(
      /<g id="contrib-rest"[^>]*>[\s\S]*?<\/g>/,
      `<g id="contrib-rest" fill="${theme.muted}" fill-rule="nonzero">\n${restUses}\n  </g>`,
    )
    .replace(/\d{1,3}(?:,\d{3})* contributions in the past year/g, label)
  if (!next.includes('id="contrib-num"') || !next.includes('id="contrib-rest"')) {
    throw new Error('failed to patch contrib groups in stack SVG')
  }
  return next
}

const total = await fetchTotal()
const label = `${total.toLocaleString('en-US')} contributions in the past year`

for (const [name, theme] of Object.entries(THEMES)) {
  const path = `assets/stack-${name}.svg`
  writeFileSync(path, patchStack(readFileSync(path, 'utf8'), total, theme))
}

const readmePath = 'README.md'
const readme = readFileSync(readmePath, 'utf8')
if (!/src="assets\/stack-light\.svg"/.test(readme)) {
  throw new Error('README.md is missing the stack image this script updates')
}
const CONTRIB = /\d{1,3}(?:,\d{3})* contributions in the past year/g
if (!CONTRIB.test(readme)) {
  throw new Error('README.md is missing the contributions phrase this script updates')
}
CONTRIB.lastIndex = 0
writeFileSync(readmePath, readme.replace(CONTRIB, label))
console.log(`${USER}: ${label}`)
