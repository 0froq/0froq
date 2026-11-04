import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const USER = process.env.PROFILE_USER || '0froq'
const TOKEN = process.env.STATS_TOKEN || process.env.GITHUB_TOKEN

const THEMES = {
  light: { ink: '#1d1d1a', accent: '#a83429', muted: '#5c5a54' },
  dark: { ink: '#ece7dc', accent: '#7ea3d9', muted: '#9c968c' },
}

// rows[0..3] = merged PRs, stars earned, contributions in N days, orgs contributed to
const LIVE_ROWS = [
  { id: 'prs', restText: 'merged PRs' },
  { id: 'stars', restText: 'stars earned' },
  { id: 'contrib', restText: 'contributions in N days' },
  { id: 'orgs', restText: 'orgs contributed to' },
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

const NUM = '\\d{1,3}(?:,\\d{3})*'

function rowLabel(row, metricsRow) {
  // restText contains optional N placeholder for a second live number (activeDays)
  const text = metricsRow.restText.replace('N', NUM)
  return { text }
}

function numRecs(metrics, str) {
  return [...str].map((ch) => {
    if (ch === ',') {
      const adv = metrics.adv[',']
      if (adv == null) throw new Error('no advance for comma')
      return { id: glyphId(metrics.prefix, metrics.size, ','), adv }
    }
    const adv = metrics.adv[ch]
    if (adv == null) throw new Error(`no advance for ${JSON.stringify(ch)}`)
    return { id: glyphId(metrics.prefix, metrics.size, ch), adv }
  })
}

const recWidth = (chars) => chars.reduce((s, r) => s + r.adv, 0)

export function patchRow(svg, metrics, row, value, days, theme) {
  const num = value.toLocaleString('en-US')
  const numChars = numRecs(metrics, num)
  const numX = metrics.midline - recWidth(numChars)
  const numUses = layoutUses(numChars, numX, row.y)
  let restX = metrics.midline + metrics.gap
  const restParts = []
  row.rest.forEach((seg, si) => {
    if (row.num2 && si === 1) {
      const dChars = numRecs(metrics, days.toLocaleString('en-US'))
      const dUses = layoutUses(dChars, restX, row.y)
      restParts.push(
        `    <g fill="${theme.accent}" fill-rule="nonzero">\n${dUses}\n    </g>`,
      )
      restX += recWidth(dChars)
    }
    restParts.push(layoutUses(seg, restX, row.y))
    restX += recWidth(seg)
  })
  const label = row.num2
    ? `${num} ${row.restText.replace('N', days.toLocaleString('en-US'))}`
    : `${num} ${row.restText}`
  const next = svg
    .replace(
      new RegExp(`<g id="${row.id}-num"[^>]*>[\\s\\S]*?<\\/g>`),
      `<g id="${row.id}-num" fill="${theme.accent}" fill-rule="nonzero">\n${numUses}\n  </g>`,
    )
    .replace(
      new RegExp(`<g id="${row.id}-rest"[^>]*>[\\s\\S]*?<\\/g>`),
      `<g id="${row.id}-rest" fill="${theme.muted}" fill-rule="nonzero">\n${restParts.join('\n')}\n  </g>`,
    )
    .replace(rowLabel(row, row).text ? phraseReFor(row) : /$^/, label)
  if (!next.includes(`id="${row.id}-num"`) || !next.includes(`id="${row.id}-rest"`)) {
    throw new Error(`failed to patch ${row.id} groups in contrib SVG`)
  }
  return next
}

function phraseReFor(row) {
  const pattern = row.num2
    ? `${NUM} ${escapeRegExp(row.restText).replace('N', NUM)}`
    : `${NUM} ${escapeRegExp(row.restText)}`
  return new RegExp(pattern, 'g')
}

export function patchContrib(svg, stats, theme) {
  const found = svg.match(/<!--metrics ({.*})-->/)
  if (!found) throw new Error('contrib SVG is missing metrics')
  let metrics
  try {
    metrics = JSON.parse(found[1])
  } catch (err) {
    throw new Error(`contrib SVG has invalid metrics JSON: ${err.message}`)
  }
  const values = {
    prs: stats.mergedPrs,
    stars: stats.stars,
    contrib: stats.contrib,
    orgs: stats.orgs,
  }
  let next = svg
  for (const row of metrics.rows) {
    const total = values[row.id]
    if (total == null) throw new Error(`no stats value for metric ${row.id}`)
    next = patchRow(next, metrics, row, total, stats.activeDays, theme)
  }
  return next
}

export function patchReadme(readme, stats) {
  if (!/src="assets\/contrib-light\.svg"/.test(readme)) {
    throw new Error('README.md is missing the contrib image this script updates')
  }
  const values = {
    prs: stats.mergedPrs,
    stars: stats.stars,
    contrib: stats.contrib,
    orgs: stats.orgs,
  }
  const liveRows = [
    { id: 'prs', restText: 'merged PRs' },
    { id: 'stars', restText: 'stars earned' },
    { id: 'contrib', restText: 'contributions in N days', num2: true },
    { id: 'orgs', restText: 'orgs contributed to' },
  ]
  let next = readme
  for (const row of liveRows) {
    const total = values[row.id]
    const pattern = row.num2
      ? `${NUM} ${escapeRegExp(row.restText).replace('N', NUM)}`
      : `${NUM} ${escapeRegExp(row.restText)}`
    const re = new RegExp(pattern, 'g')
    if (!re.test(next)) {
      throw new Error(`README.md is missing the ${row.id} phrase this script updates`)
    }
    re.lastIndex = 0
    const label = row.num2
      ? `${total.toLocaleString('en-US')} ${row.restText.replace('N', stats.activeDays.toLocaleString('en-US'))}`
      : `${total.toLocaleString('en-US')} ${row.restText}`
    next = next.replace(re, label)
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

async function rest(path) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `bearer ${TOKEN}`,
      'User-Agent': 'profile-stats',
      Accept: 'application/vnd.github+json',
    },
  })
  const json = await res.json()
  if (!res.ok) throw new Error(JSON.stringify(json))
  return json
}

export async function fetchStats() {
  if (!TOKEN) throw new Error('Set GITHUB_TOKEN (or STATS_TOKEN) to query the GitHub GraphQL API')
  const query = `query($u:String!,$c:String){
    user(login:$u){
      contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{contributionCount}}}}
      repositories(ownerAffiliations:OWNER, privacy:PUBLIC, first:100, after:$c){
        totalCount
        pageInfo{hasNextPage endCursor}
        nodes{stargazerCount}
      }
    }
  }`
  let contrib = null
  let activeDays = 0
  let stars = 0
  let cursor = null
  let hasNext = true
  while (hasNext) {
    const data = await gql(query, { u: USER, c: cursor })
    const user = data.user
    if (contrib == null) {
      const cal = user.contributionsCollection.contributionCalendar
      contrib = cal.totalContributions
      for (const week of cal.weeks) {
        for (const day of week.contributionDays) {
          if (day.contributionCount > 0) activeDays += 1
        }
      }
    }
    for (const node of user.repositories.nodes) stars += node.stargazerCount
    hasNext = user.repositories.pageInfo.hasNextPage
    cursor = user.repositories.pageInfo.endCursor
  }
  const { mergedPrs, orgs } = await fetchExternalPrs()
  return { mergedPrs, stars, contrib, activeDays, orgs }
}

async function fetchExternalPrs() {
  // merged PRs authored by USER to repos not owned by USER
  const json = await rest(
    `/search/issues?q=${encodeURIComponent(`type:pr author:${USER} is:merged -user:${USER}`)}&per_page=100`,
  )
  const owners = new Set()
  for (const item of json.items || []) {
    // repository_url: https://api.github.com/repos/<owner>/<repo>
    owners.add(item.repository_url.split('/').slice(-2)[0])
  }
  return { mergedPrs: json.total_count ?? 0, orgs: owners.size }
}

async function run() {
  const stats = await fetchStats()
  for (const [name, theme] of Object.entries(THEMES)) {
    const path = `assets/contrib-${name}.svg`
    writeFileSync(path, patchContrib(readFileSync(path, 'utf8'), stats, theme))
  }
  const readmePath = 'README.md'
  writeFileSync(readmePath, patchReadme(readFileSync(readmePath, 'utf8'), stats))
  console.log(
    `${USER}: ${stats.mergedPrs.toLocaleString('en-US')} merged PRs, ${stats.stars.toLocaleString('en-US')} stars, ${stats.contrib.toLocaleString('en-US')} contributions in ${stats.activeDays.toLocaleString('en-US')} days, ${stats.orgs.toLocaleString('en-US')} orgs`,
  )
}

const isCli = Boolean(process.argv[1]) && fileURLToPath(import.meta.url) === resolve(process.argv[1])
if (isCli) await run()
