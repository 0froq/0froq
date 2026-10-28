import { mkdirSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import {
  inkClipboardBoardPath,
  inkClipboardClipPath,
  inkClipboardLinesPath,
  inkRulePath,
} from './inkDraw.mjs'

const W = 640
const SIZE = 16
const SERIF = `Georgia, 'Iowan Old Style', 'Palatino Linotype', Palatino, 'Liberation Serif', 'Noto Serif', 'Times New Roman', serif`
const MONO = `ui-monospace, 'SFMono-Regular', 'DejaVu Sans Mono', Menlo, Consolas, monospace`
const PARA = 36
const WRAP = 24

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

function gloss(color) {
  return `text-decoration: underline solid ${color}; text-underline-offset: 2px; text-decoration-thickness: 1px;`
}

function dashed(color) {
  return `text-decoration: underline dashed ${color}; text-underline-offset: 3px; text-decoration-thickness: 1px;`
}

function measure(items) {
  const html = `<!doctype html><meta charset="utf-8"><svg xmlns="http://www.w3.org/2000/svg"><text id="t"></text></svg><pre id="out"></pre><script>
const items = ${JSON.stringify(items)};
const t = document.getElementById('t');
const result = {};
for (const item of items) {
  t.setAttribute('font-family', item.mono ? ${JSON.stringify(MONO)} : ${JSON.stringify(SERIF)});
  t.setAttribute('font-size', String(item.size));
  t.setAttribute('font-style', item.italic ? 'italic' : 'normal');
  t.textContent = item.text;
  result[item.id] = t.getComputedTextLength();
}
document.getElementById('out').textContent = JSON.stringify(result);
</script>`
  writeFileSync('/tmp/profile-measure.html', html)
  const chrome = spawnSync(
    'google-chrome',
    ['--headless', '--disable-gpu', '--no-sandbox', '--user-data-dir=/tmp/chrome-measure', '--virtual-time-budget=3000', '--dump-dom', '/tmp/profile-measure.html'],
    { encoding: 'utf8', timeout: 30000 },
  )
  if (chrome.status !== 0) throw new Error(chrome.stderr || 'chrome measure failed')
  const m = chrome.stdout.match(/<pre id="out">([\s\S]*?)<\/pre>/)
  if (!m) throw new Error('measure output missing')
  return JSON.parse(m[1])
}

function svg(w, h, body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" overflow="visible">
${body}
</svg>
`
}

function bio(theme, aestheticsLines) {
  const lines = [
    null,
    ["I'm doing a master's degree, which is not the point at all."],
    ['I code, build, read, write, and plenty of other stuff.'],
    aestheticsLines,
    [
      'My dream job is to work on the intersection of design and development.',
      'If possible, I want to be a full-time open source contributor.',
    ],
  ]
  let y = 18
  const parts = []
  const hola = `<text xml:space="preserve" x="0" y="${y}" font-family="${SERIF}" font-size="${SIZE}" fill="${theme.ink}">Hola! I'm <tspan style="${gloss(theme.accent)}">froQ</tspan>.<tspan dx="8" font-family="DejaVu Sans, 'Segoe UI Symbol', 'Noto Sans Symbols 2', sans-serif" font-size="12" fill="${theme.muted}">→</tspan><tspan font-size="11" font-style="italic" fill="${theme.muted}"> frog (maybe)</tspan></text>`
  parts.push(hola)
  y += PARA
  for (let i = 1; i < lines.length; i++) {
    const block = lines[i]
    block.forEach((line, li) => {
      parts.push(
        `<text xml:space="preserve" x="0" y="${y}" font-family="${SERIF}" font-size="${SIZE}" fill="${theme.ink}">${esc(line)}</text>`,
      )
      y += li === block.length - 1 ? PARA : WRAP
    })
  }
  const h = y - PARA + 8
  return { svg: svg(W, h, parts.join('\n')), h }
}

function linkLine(theme, inner, y, h, extra = '') {
  return svg(W, h, `<text xml:space="preserve" x="0" y="${y}" font-family="${SERIF}" font-size="${SIZE}" fill="${theme.ink}">${inner}</text>${extra}`)
}

function cv(theme) {
  const y = 20
  const icon = `<g transform="translate(0 ${y - 14}) scale(0.82)" fill="none" stroke="${theme.ink}" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round">
    <path d="${inkClipboardBoardPath('profile-cv')}"/>
    <path d="${inkClipboardClipPath('profile-cv')}"/>
    <path d="${inkClipboardLinesPath('profile-cv')}"/>
  </g>`
  const text = `<text xml:space="preserve" x="20" y="${y}" font-family="${SERIF}" font-size="${SIZE}" fill="${theme.ink}"><tspan style="${dashed(theme.accent)}">My CV</tspan> is here.</text>`
  return svg(W, 32, icon + text)
}

function sponsor(theme) {
  const text = `<tspan>Sponsor me on </tspan><tspan style="${dashed(theme.accent)}">爱发电</tspan><tspan>.</tspan>`
  return linkLine(theme, text, 18, 28)
}

function rule(theme) {
  const d = inkRulePath('profile-hr', 120, 4)
  return svg(W, 20, `<g transform="translate(${(W - 120) / 2} 6)"><path d="${d}" fill="none" stroke="${theme.muted}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></g>`)
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

function notes(theme) {
  const text = `<tspan fill="${theme.muted}">Longer notes on the </tspan><tspan fill="${theme.accent}" style="${dashed(theme.accent)}">stack</tspan><tspan fill="${theme.muted}">.</tspan>`
  return svg(
    W,
    28,
    `<text xml:space="preserve" x="0" y="16" font-family="${SERIF}" font-size="14" fill="${theme.muted}">${text}</text>`,
  )
}

const items = [
  { id: 'aes', text: 'Most of the time I have a thing for aesthetics—and how things feel to use.', size: SIZE },
  { id: 'dream', text: 'My dream job is to work on the intersection of design and development.', size: SIZE },
  { id: 'Stack', text: 'Stack', size: 15 },
]
for (const group of groups) {
  for (const [name] of group.tools) items.push({ id: name, text: name, size: 15 })
}
const widths = measure(items)
for (const [id, w] of Object.entries(widths)) {
  if (id === 'aes' || id === 'dream') {
    if (w * 1.15 > W - 8) throw new Error(`${id} is ${w}px, too wide for the column`)
  }
}

const aes =
  widths.aes * 1.12 > W - 16
    ? ['Most of the time I have a thing for aesthetics—', 'and how things feel to use.']
    : ['Most of the time I have a thing for aesthetics—and how things feel to use.']

mkdirSync('assets', { recursive: true })
for (const [name, theme] of Object.entries(THEMES)) {
  writeFileSync(`assets/bio-${name}.svg`, bio(theme, aes).svg)
  writeFileSync(`assets/cv-${name}.svg`, cv(theme))
  writeFileSync(`assets/sponsor-${name}.svg`, sponsor(theme))
  writeFileSync(`assets/rule-${name}.svg`, rule(theme))
  writeFileSync(`assets/stack-${name}.svg`, stack(theme, widths).svg)
  writeFileSync(`assets/notes-${name}.svg`, notes(theme))
}

function picture(base, alt) {
  return `<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/${base}-dark.svg">
  <img alt="${esc(alt)}" src="assets/${base}-light.svg" width="${W}">
</picture>`
}

const bioAlt = [
  "Hola! I'm froQ. frog (maybe).",
  "I'm doing a master's degree, which is not the point at all.",
  'I code, build, read, write, and plenty of other stuff.',
  'Most of the time I have a thing for aesthetics—and how things feel to use.',
  'My dream job is to work on the intersection of design and development. If possible, I want to be a full-time open source contributor.',
].join(' ')

const stackAlt = groups.map((g) => `${g.level}: ${g.tools.map(([n]) => n).join(', ')}`).join('. ')

const readme = [
  '<div>',
  picture('bio', bioAlt),
  '</div>',
  '<div>',
  '<a href="https://froq.me/cv">',
  picture('cv', 'My CV is here.'),
  '</a>',
  '</div>',
  '<div>',
  '<a href="https://afdian.com/a/froq-sponsor-me">',
  picture('sponsor', 'Sponsor me on 爱发电.'),
  '</a>',
  '</div>',
  '<div>',
  picture('rule', ''),
  '</div>',
  '<div>',
  picture('stack', `Stack. ${stackAlt}`),
  '</div>',
  '<div>',
  '<a href="https://froq.me/stack">',
  picture('notes', 'Longer notes on the stack.'),
  '</a>',
  '</div>',
  '<div>',
  picture('stats', 'contributions in the past year'),
  '</div>',
  '',
].join('\n')

writeFileSync('README.md', readme)
console.log('aes', widths.aes.toFixed(1), 'dream', widths.dream.toFixed(1), 'lines', aes.length)
