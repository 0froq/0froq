// Regenerates assets/stack-{light,dark}.svg and README.md (pure Node, no browser).
//   Locally:  node scripts/profile.mjs && GITHUB_TOKEN=$(gh auth token) node scripts/stats.mjs
//   Action:   .github/workflows/stats.yml (workflow_dispatch, schedule, or push to scripts/)
// The stats image alt (live contribution count) is preserved from the current README.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

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

// Times-like advance widths in em. GitHub renders Georgia, which is wider,
// so wrapTools applies a 1.14 safety factor on top of this estimate.
const NARROW = new Set("iljtfIJ.,;:'|!()/ ")
const WIDE = new Set('mwMW')

function textWidth(text, size) {
  let em = 0
  for (const ch of text) {
    if (ch === ' ') em += 0.25
    else if (NARROW.has(ch)) em += 0.3
    else if (WIDE.has(ch)) em += 0.8
    else if (/[A-Z0-9×]/.test(ch)) em += 0.68
    else if (/[^\x00-\x7f]/.test(ch)) em += 1
    else em += 0.46
  }
  return em * size
}

function svg(w, h, body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="visible">
${body}
</svg>
`
}

function wrapTools(tools, widths) {
  const max = 500
  const lines = []
  let line = []
  let used = 0
  for (const [name, joke] of tools) {
    const w = widths[name] * 1.14
    const gap = line.length ? 22 : 0
    if (line.length && used + gap + w > max) {
      lines.push(line)
      line = [[name, joke]]
      used = w
    } else {
      line.push([name, joke])
      used += gap + w
    }
  }
  if (line.length) lines.push(line)
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

function stack(theme, widths) {
  const titleSize = 15
  const titleW = widths.Stack
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
    const lines = wrapTools(group.tools, widths)
    lines.forEach((line, li) => {
      if (li === 0) {
        parts.push(
          `<text x="92" y="${y}" text-anchor="end" font-family="${MONO}" font-size="11" letter-spacing="0.08em" fill="${color}">${esc(group.level)}</text>`,
        )
      }
      parts.push(
        `<text xml:space="preserve" x="112" y="${y}" font-family="${SERIF}" font-size="15" fill="${theme.ink}">${namesLine(theme, line)}</text>`,
      )
      y += li === lines.length - 1 ? 28 : 22
    })
  })
  const h = y + 4
  return { svg: svg(W, h, parts.join('\n')), h }
}

const widths = { Stack: textWidth('Stack', 15) }
for (const group of groups) {
  for (const [name] of group.tools) widths[name] = textWidth(name, 15)
}

mkdirSync('assets', { recursive: true })
for (const [name, theme] of Object.entries(THEMES)) {
  writeFileSync(`assets/stack-${name}.svg`, stack(theme, widths).svg)
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

const readme = `Hola! I'm froQ. → *frog (maybe)*

I'm doing a master's degree, which is not the point at all.

I code, build, read, write, and plenty of other stuff.

Most of the time I have a thing for aesthetics—and how things feel to use.

My dream job is to work on the intersection of design and development.
If possible, I want to be a full-time open source contributor.

[My CV](https://froq.me/cv) is here.

Sponsor me on [爱发电](https://afdian.com/a/froq-sponsor-me).

${picture('stack', `Stack. ${stackAlt}`)}

Longer notes on the [stack](https://froq.me/stack).

${picture('stats', statsAlt)}
`

writeFileSync('README.md', readme)
console.log('stack rows', groups.length)
