import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const USER = process.env.PROFILE_USER || '0froq'
const TOKEN = process.env.STATS_TOKEN || process.env.GITHUB_TOKEN

const THEMES = {
  light: { ink: '#1d1d1a', accent: '#a83429', muted: '#5c5a54' },
  dark: { ink: '#ece7dc', accent: '#7ea3d9', muted: '#9c968c' },
}

const LIVE_ROWS = [
  { id: 'contrib', restText: ' contributions in the past year' },
  { id: 'stars', restText: ' stars across public repos' },
  { id: 'repos', restText: ' public repositories' },
]

export function glyphId(prefix, size, ch) {
  return `${prefix}_${size}_${ch.codePointAt(0).toString(16)}`
}

export function layoutUses(chars, startX, y) {
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

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function phraseRe(restText) {
  return new RegExp(`\\d{1,3}(?:,\\d{3})*${escapeRegExp(restText)}`, 'g')
}

export function patchRow(svg, metrics, row, total, theme) {
  const num = total.toLocaleString('en-US')
  const numChars = [...num].map((ch) => {
    const adv = metrics.adv[ch]
    if (adv == null) throw new Error(`no advance for ${JSON.stringify(ch)}`)
    return { id: glyphId(metrics.prefix, metrics.size, ch), adv }
  })
  let x = row.x
  const numUses = layoutUses(numChars, x, row.y)
  x += numChars.reduce((sum, rec) => sum + rec.adv, 0)
  const restUses = layoutUses(row.rest, x, row.y)
  const label = `${num}${row.restText}`
  const next = svg
    .replace(
      new RegExp(`<g id="${row.id}-num"[^>]*>[\\s\\S]*?<\\/g>`),
      `<g id="${row.id}-num" fill="${theme.accent}" fill-rule="nonzero">\n${numUses}\n  </g>`,
    )
    .replace(
      new RegExp(`<g id="${row.id}-rest"[^>]*>[\\s\\S]*?<\\/g>`),
      `<g id="${row.id}-rest" fill="${theme.muted}" fill-rule="nonzero">\n${restUses}\n  </g>`,
    )
    .replace(phraseRe(row.restText), label)
  if (!next.includes(`id="${row.id}-num"`) || !next.includes(`id="${row.id}-rest"`)) {
    throw new Error(`failed to patch ${row.id} groups in stack SVG`)
  }
  return next
}

export function patchStack(svg, stats, theme) {
  const found = svg.match(/<!--metrics ({.*})-->/)
  if (!found) throw new Error('stack SVG is missing metrics')
  const metrics = JSON.parse(found[1])
  const values = { contrib: stats.contrib, stars: stats.stars, repos: stats.repos }
  let next = svg
  for (const row of metrics.rows) {
    const total = values[row.id]
    if (total == null) throw new Error(`no stats value for metric ${row.id}`)
    next = patchRow(next, metrics, row, total, theme)
  }
  return next
}

export function patchReadme(readme, stats) {
  if (!/src="assets\/stack-light\.svg"/.test(readme)) {
    throw new Error('README.md is missing the stack image this script updates')
  }
  const values = { contrib: stats.contrib, stars: stats.stars, repos: stats.repos }
  let next = readme
  for (const row of LIVE_ROWS) {
    const total = values[row.id]
    const re = phraseRe(row.restText)
    if (!re.test(next)) {
      throw new Error(`README.md is missing the ${row.id} phrase this script updates`)
    }
    re.lastIndex = 0
    next = next.replace(re, `${total.toLocaleString('en-US')}${row.restText}`)
  }
  return next
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

export async function fetchStats() {
  if (!TOKEN) throw new Error('Set GITHUB_TOKEN (or STATS_TOKEN) to query the GitHub GraphQL API')
  const query = `query($u:String!,$c:String){
    user(login:$u){
      contributionsCollection{contributionCalendar{totalContributions}}
      repositories(ownerAffiliations:OWNER, privacy:PUBLIC, first:100, after:$c){
        totalCount
        pageInfo{hasNextPage endCursor}
        nodes{stargazerCount}
      }
    }
  }`
  let contrib = null
  let repos = 0
  let stars = 0
  let cursor = null
  let hasNext = true
  while (hasNext) {
    const data = await gql(query, { u: USER, c: cursor })
    const user = data.user
    if (contrib == null) {
      contrib = user.contributionsCollection.contributionCalendar.totalContributions
    }
    repos = user.repositories.totalCount
    for (const node of user.repositories.nodes) stars += node.stargazerCount
    hasNext = user.repositories.pageInfo.hasNextPage
    cursor = user.repositories.pageInfo.endCursor
  }
  return { contrib, stars, repos }
}

async function run() {
  const stats = await fetchStats()
  for (const [name, theme] of Object.entries(THEMES)) {
    const path = `assets/stack-${name}.svg`
    writeFileSync(path, patchStack(readFileSync(path, 'utf8'), stats, theme))
  }
  const readmePath = 'README.md'
  writeFileSync(readmePath, patchReadme(readFileSync(readmePath, 'utf8'), stats))
  console.log(
    `${USER}: ${stats.contrib.toLocaleString('en-US')} contributions, ${stats.stars.toLocaleString('en-US')} stars, ${stats.repos.toLocaleString('en-US')} public repos`,
  )
}

const isCli = Boolean(process.argv[1]) && fileURLToPath(import.meta.url) === resolve(process.argv[1])
if (isCli) await run()
