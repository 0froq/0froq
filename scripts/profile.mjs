// Regenerates assets/{bio,cv,sponsor,notes,stack}-{light,dark}.svg and README.md.
// Text is measured with Gelasio (metric-compatible with Georgia) via opentype.js: `npm ci` first.
//   Locally:  npm ci && node scripts/profile.mjs && GITHUB_TOKEN=$(gh auth token) node scripts/stats.mjs
//   Action:   .github/workflows/stats.yml (workflow_dispatch, schedule, or push to scripts/)
// The stats image alt (live contribution count) is preserved from the current README.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { textWidth } from './measure.mjs'

const W = 640
const SERIF = `Georgia, 'Iowan Old Style', 'Palatino Linotype', Palatino, 'Liberation Serif', 'Noto Serif', 'Times New Roman', serif`
const MONO = `ui-monospace, 'SFMono-Regular', 'DejaVu Sans Mono', Menlo, Consolas, monospace`

const THEMES = {
  light: {
    ink: '#1d1d1a',
    accent: '#a83429',
    wry: '#4d6a3c',
    muted: '#5c5a54',
    line: '#c9c4b8',
  },
  dark: {
    ink: '#ece7dc',
    accent: '#7ea3d9',
    wry: '#d4a574',
    muted: '#9c968c',
    line: '#3f3a33',
  },
}

const groups = [
  {
    level: 'Fluent',
    tools: [
      ['Markdown', false],
      ['Keyboard Layouts', false],
      ['3×3 Cube Speed-solving', true],
    ],
  },
  {
    level: 'Daily',
    tools: [
      ['Vue.js', false],
      ['TypeScript', false],
      ['CSS/UnoCSS', false],
      ['Git', false],
      ['Neovim', false],
      ['AI Agents', false],
      ['Scraps', true],
      ['Deep Work', true],
    ],
  },
  {
    level: 'Used',
    tools: [
      ['Python', false],
      ['Personal Knowledge Management', false],
      ['Writing', true],
      ['Minecraft', true],
      ['Pour Over', true],
    ],
  },
  {
    level: 'Learning',
    tools: [
      ['Nuxt', false],
      ['Visual Design', true],
      ['Espresso', true],
      ['Podcasting', true],
    ],
  },
  {
    level: 'Curious',
    tools: [
      ['iOS Development', false],
      ['Game Design', true],
      ['Creative Coding', true],
    ],
  },
]

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function hex(c) {
  return [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))
}

function mix(a, b, t) {
  const ca = hex(a)
  const cb = hex(b)
  const out = ca.map((v, i) => Math.round(v * (1 - t) + cb[i] * t))
  return `#${out.map((n) => n.toString(16).padStart(2, '0')).join('')}`
}

function svg(w, h, body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="visible">
${body}
</svg>
`
}

const NAME_X = 112
const NAME_SIZE = 15
const SEP_W = textWidth(' · ', NAME_SIZE)
const ROW_MAX = W - NAME_X - 8

function rowWidth(names) {
  return names.reduce((sum, n, i) => sum + textWidth(n, NAME_SIZE) + (i ? SEP_W : 0), 0)
}

// Fewest rows that fit, then split the names so the rows come out even.
function wrapTools(tools) {
  const n = tools.length
  const names = tools.map(([name]) => name)
  const fits = (i, j) => rowWidth(names.slice(i, j)) <= ROW_MAX
  let rows = 1
  while (rows < n) {
    let i = 0
    let count = 0
    while (i < n) {
      let j = i + 1
      while (j < n && fits(i, j + 1)) j++
      i = j
      count++
    }
    if (count <= rows) break
    rows++
  }
  const best = Array.from({ length: rows + 1 }, () => new Array(n + 1).fill(null))
  best[0][0] = { cost: 0, prev: -1 }
  for (let r = 1; r <= rows; r++) {
    for (let j = 1; j <= n; j++) {
      for (let i = r - 1; i < j; i++) {
        if (!best[r - 1][i] || !fits(i, j)) continue
        const cost = Math.max(best[r - 1][i].cost, rowWidth(names.slice(i, j)))
        if (!best[r][j] || cost < best[r][j].cost) best[r][j] = { cost, prev: i }
      }
    }
  }
  const lines = []
  let j = n
  for (let r = rows; r >= 1; r--) {
    const i = best[r][j].prev
    lines.unshift(tools.slice(i, j))
    j = i
  }
  return lines
}

function namesLine(theme, line) {
  return line
    .map(([name, joke], i) => {
      const sep = i ? `<tspan fill="${theme.muted}" fill-opacity="0.55"> · </tspan>` : ''
      return `${sep}<tspan fill="${joke ? theme.wry : theme.ink}">${esc(name)}</tspan>`
    })
    .join('')
}

function stack(theme) {
  const titleSize = 15
  const titleW = textWidth('Stack', 15)
  const titleX = 22
  const yTitle = 16
  const ruleY = 11
  const lineStart = titleX + titleW + 16
  const fade = 64
  const tail = 48
  const parts = []
  parts.push(`<defs>
    <linearGradient id="to-line" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${theme.accent}"/>
      <stop offset="1" stop-color="${theme.line}"/>
    </linearGradient>
    <linearGradient id="to-fade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${theme.line}"/>
      <stop offset="1" stop-color="${theme.line}" stop-opacity="0"/>
    </linearGradient>
  </defs>`)
  parts.push(`<line x1="0" y1="${ruleY}" x2="12" y2="${ruleY}" stroke="${theme.accent}" stroke-width="1"/>`)
  parts.push(`<text x="${titleX}" y="${yTitle}" font-family="${SERIF}" font-size="${titleSize}" fill="${theme.accent}">Stack</text>`)
  parts.push(`<rect x="${lineStart}" y="${ruleY - 0.5}" width="${fade}" height="1" fill="url(#to-line)"/>`)
  const solidX = lineStart + fade
  const solidW = Math.max(0, W - tail - solidX)
  parts.push(`<rect x="${solidX}" y="${ruleY - 0.5}" width="${solidW}" height="1" fill="${theme.line}"/>`)
  parts.push(`<rect x="${W - tail}" y="${ruleY - 0.5}" width="${tail}" height="1" fill="url(#to-fade)"/>`)

  let y = 46
  groups.forEach((group, i) => {
    const color = mix(theme.accent, theme.ink, i / (groups.length - 1))
    const lines = wrapTools(group.tools)
    lines.forEach((line, li) => {
      if (li === 0) {
        parts.push(
          `<text x="92" y="${y}" text-anchor="end" font-family="${MONO}" font-size="11" letter-spacing="0.08em" fill="${color}">${esc(group.level)}</text>`,
        )
      }
      parts.push(
        `<text xml:space="preserve" x="${NAME_X}" y="${y}" font-family="${SERIF}" font-size="${NAME_SIZE}" fill="${theme.ink}">${namesLine(theme, line)}</text>`,
      )
      y += li === lines.length - 1 ? 28 : 22
    })
  })
  const h = y + 4
  return { svg: svg(W, h, parts.join('\n')), h }
}

const BODY = 16
// Underlines are text-decoration on the word itself so they follow the real font.
function deco(theme, word, style) {
  return `<tspan style="text-decoration: underline ${style} ${theme.accent}; text-underline-offset: 3px; text-decoration-thickness: 1px;">${esc(word)}</tspan>`
}

function bioLine(theme, y, inner) {
  return `<text xml:space="preserve" x="0" y="${y}" font-family="${SERIF}" font-size="${BODY}" fill="${theme.ink}">${inner}</text>`
}

function bio(theme) {
  const blocks = [
    [
      `Hola! I'm ${deco(theme, 'froQ', 'solid')}. <tspan fill="${theme.muted}" font-style="italic" font-size="13">→ frog (maybe)</tspan>`,
    ],
    ["I'm doing a master's degree, which is not the point at all."],
    ['I code, build, read, write, and plenty of other stuff.'],
    ['Most of the time I have a thing for aesthetics—and how things feel to use.'],
    [
      'My dream job is to work on the intersection of design and development.',
      'If possible, I want to be a full-time open source contributor.',
    ],
  ]
  const parts = []
  let y = 18
  blocks.forEach((lines, bi) => {
    lines.forEach((line, li) => {
      const plain = line.replace(/<[^>]+>/g, '')
      if (textWidth(plain, BODY) > W) throw new Error(`bio line too wide: ${plain}`)
      parts.push(bioLine(theme, y, bi === 0 ? line : esc(line)))
      y += li === lines.length - 1 ? 34 : 24
    })
  })
  return svg(W, y - 34 + 12, parts.join('\n'))
}

function linkRow(theme, prefix, word, suffix, h = 28) {
  const inner = `${esc(prefix)}${deco(theme, word, 'dashed')}${esc(suffix)}`
  return svg(W, h, bioLine(theme, 18, inner))
}

const cv = (theme) => linkRow(theme, '', 'My CV', ' is here.')
const sponsor = (theme) => linkRow(theme, 'Sponsor me on ', '爱发电', '.', 44)
const notes = (theme) => linkRow(theme, 'Longer notes on the ', 'stack', '.')

mkdirSync('assets', { recursive: true })
for (const [name, theme] of Object.entries(THEMES)) {
  writeFileSync(`assets/bio-${name}.svg`, bio(theme))
  writeFileSync(`assets/cv-${name}.svg`, cv(theme))
  writeFileSync(`assets/sponsor-${name}.svg`, sponsor(theme))
  writeFileSync(`assets/notes-${name}.svg`, notes(theme))
  writeFileSync(`assets/stack-${name}.svg`, stack(theme).svg)
}

function picture(base, alt) {
  return `<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/${base}-dark.svg">
  <img alt="${esc(alt)}" src="assets/${base}-light.svg" width="${W}">
</picture>`
}

const STATS_ALT = /<img alt="([^"]*)" src="assets\/stats-light\.svg"/
const statsAlt =
  (existsSync('README.md') && readFileSync('README.md', 'utf8').match(STATS_ALT)?.[1]) ||
  'contributions in the past year'

const stackAlt = groups.map((g) => `${g.level}: ${g.tools.map(([n]) => n).join(', ')}`).join('. ')

const bioAlt = [
  "Hola! I'm froQ. frog (maybe).",
  "I'm doing a master's degree, which is not the point at all.",
  'I code, build, read, write, and plenty of other stuff.',
  'Most of the time I have a thing for aesthetics—and how things feel to use.',
  'My dream job is to work on the intersection of design and development. If possible, I want to be a full-time open source contributor.',
].join(' ')

const block = (inner) => `<div>\n${inner}\n</div>`
const link = (href, inner) => `<a href="${href}">\n${inner}\n</a>`

const readme =
  [
    block(picture('bio', bioAlt)),
    block(link('https://froq.me/cv', picture('cv', 'My CV is here.'))),
    block(link('https://afdian.com/a/froq-sponsor-me', picture('sponsor', 'Sponsor me on 爱发电.'))),
    block(picture('stack', `Stack. ${stackAlt}`)),
    block(link('https://froq.me/stack', picture('notes', 'Longer notes on the stack.'))),
    block(picture('stats', statsAlt)),
  ].join('\n') + '\n'

writeFileSync('README.md', readme)
console.log('stack rows', groups.length)
