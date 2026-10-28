import { mkdirSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

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

const items = [{ id: 'Stack', text: 'Stack', size: 15 }]
for (const group of groups) {
  for (const [name] of group.tools) items.push({ id: name, text: name, size: 15 })
}
const widths = measure(items)

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

${picture('stats', 'contributions in the past year')}
`

writeFileSync('README.md', readme)
console.log('stack rows', groups.length)
