import { writeFileSync, mkdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import {
  inkArrowPath,
  inkClipboardBoardPath,
  inkClipboardClipPath,
  inkClipboardLinesPath,
  inkRulePath,
} from './inkDraw.mjs'

const FONT = `Georgia, 'Liberation Serif', 'Noto Serif', 'Times New Roman', serif`
const SIZE = 20
const INTERVAL = 0.018
const BREAK = 0.28
const FADE = 0.16

const THEMES = {
  light: {
    ink: '#1d1d1a',
    accent: '#a83429',
    wry: '#4d6a3c',
    muted: '#5c5a54',
  },
  dark: {
    ink: '#ece7dc',
    accent: '#7ea3d9',
    wry: '#d4a574',
    muted: '#9c968c',
  },
}

const paras = [
  ["Hola! I'm froQ."],
  ["I'm doing a master's degree, which is not the point at all."],
  ['I code, build, read, write, and plenty of other stuff.'],
  ['Most of the time I have a thing for aesthetics—and how things feel to use.'],
  [
    'My dream job is to work on the intersection of design and development. If possible,',
    'I want to be a full-time open source contributor.',
  ],
]

const CV = 'My CV is here.'
const SPONSOR = 'Sponsor me on 爱发电.'
const NOTE = 'frog (maybe)'

const groups = [
  {
    level: 'fluent',
    label: 'Fluent',
    tools: [
      {
        name: 'Markdown',
        story:
          "I first picked up Markdown in my 1st year of university, for writing, publishing and an unhealthy fascination with PKM. Years of Obsidian, Typora, and web work later, I'm comfortable not only with the syntax itself, but also with GFM, CommonMark and the wider MD tooling ecosystem.",
      },
      {
        name: 'Keyboard Layouts',
        story:
          'I stopped collecting keyboards fairly quickly after discovering split 40% layouts; the rabbit hole I stayed in was mapping. Colemak-DH, Home Row Mods, layers and combos are now muscle memory, backed by a fairly opinionated system for where keys and symbols should be.',
      },
      {
        name: '3×3 Cube Speed-solving',
        joke: true,
        story:
          'I spent a mildly unreasonable part of my middle school years speed-solving the 3×3 cubes, with a 10s PB and 18s Ao5 at my peak. I also managed to drag most of my class into cubing for a while, which may be my earliest documented case of accidental community building.',
      },
    ],
  },
  {
    level: 'daily',
    label: 'Daily',
    tools: [
      {
        name: 'Vue.js',
        story:
          "Vue 3 was my entrance into frontend development: I found it while trying to build a personal site, before I properly knew JavaScript or HTML. Since then I've used Vue for everything from personal projects to coursework that probably shouldn't have been done in web dev.",
      },
      {
        name: 'TypeScript',
        story:
          "I moved from JavaScript to TypeScript because I simply prefer software to tell me when I'm wrong. It is now the default for almost every project I start; I'm comfortable writing application code with it, while still learning how to design elegant generic and type-level APIs instead of merely satisfying the checker.",
      },
      {
        name: 'CSS/UnoCSS',
        story:
          "CSS actually predates JavaScript in my own timeline: I first used SCSS to build an Obsidian theme before I started frontend development properly. These day I'm comfortable with responsive layouts, Flexbox, Grid and the usual pseudo-elements and states, while UnoCSS has become the layer I reach for most often when actually building interfaces.",
      },
      {
        name: 'Git',
        story:
          'I used to do almost everything in Git manually from the CLI, including hunk-level staging and the occasional reset, revert or cherry-pick. These days I delegate more of the mechanical work to AI agents, but the workflow is still mine: atomic conventional commits, and a strong dislike of using `chore` as a drawer for changes nobody bothered to classify.',
      },
      {
        name: 'Neovim',
        story:
          'I moved from VS Code to Neovim after getting tired of performance issues and moving my hands away from the home row just to navigate text. My config eventually grew into its own ecosystem, including a small plugin called `headup.nvim`; I currently write most code in Cursor for the AI layer, but Neovim is still the editing model I actually prefer.',
      },
      {
        name: 'AI Agents',
        story:
          "I've watched coding with AI evolve from copying errors into ChatGPT, through Tab completion and Copilot, into agents that can operate on entire repos. I now maintain my own prompts, commands and agent instructions, and have experimented with various harnesses, multi-agent orchestration and cross-session workflows; I understand the user-facing layer much better than the internals, and that boundary is something I'm still pushing on.",
      },
      {
        name: 'Scraps',
        joke: true,
        story:
          'Scraps exist because I once designed knowledge systems so elaborate that putting information into them became work. This is the opposite: thoughts, fragments and sometime completely useless words are allowed to exist without category, a future purpose or even the expectation that I will ever read them.',
      },
      {
        name: 'Deep Work',
        joke: true,
        story:
          'I strongly prefer keeping one context loaded for hours at a time. A 6-hour session often feels cheaper than being interrupted twice; the expensive part is reconstructing the mental state after it has been evicted.',
      },
    ],
  },
  {
    level: 'used',
    label: 'Used',
    tools: [
      {
        name: 'Python',
        story:
          "Python was the first programming language I was formally taught, and I've written enough scripts, automation and fairly substantial data-processing code with it to know that I can use it. I just rarely want to: dynamic typing, indentation-as-syntax and parts of its tooling have never matched how I like software to feel.",
      },
      {
        name: 'Personal Knowledge Management',
        joke: true,
        story:
          'I spent a large part of my first two university years trying to organise knowledge properly, eventually building an Obsidian system around atomic Notes, Concepts and higher-level Topics. The system is gone, but the lesson stayed: the more aggressively information is classified, the easier it is to flatten the context that originally gave it meaning.',
      },
      {
        name: 'Writing',
        joke: true,
        story:
          'I used to write more frequently, mostly personal and reflective essays rather than technical pieces. Woolf gave me an interest in stream-of-consciousness, Shi Tiesheng pushed me towards plainer and more restrained prose, while Camus affected the questions I ask more than the sentences I write.',
      },
      {
        name: 'Minecraft',
        joke: true,
        story:
          "I've been playing Minecraft since the 1.7 era, almost entirely in survival. I'm much more interested in building believable spaces, farming and slow modded play than in redstone,automation and competitive PvP.",
      },
      {
        name: 'Pour Over',
        joke: true,
        story:
          'I started making pour-over coffee a couple of years ago, but never turned into much of a ceremony. I grind my own beans and have settled into a brewing habit of questionable theoretical validity; fortunately, my palate is not sensitive enough to file a formal complaint.',
      },
    ],
  },
  {
    level: 'learning',
    label: 'Learning',
    tools: [
      {
        name: 'Nuxt',
        story:
          "I found Nuxt through the wider Vue ecosystem and was drawn to things like auto-imports, server APIs and Nitro long before I actually needed most of them. The personal site runs on Nuxt Content now. I'm still learning the corners I don't touch every day.",
      },
      {
        name: 'Visual Design',
        joke: true,
        story:
          "Most of what I know about visual design still comes from taste rather than formal training. I tend towards restrained colour, grayscale, serif typography and small accents, and I'm increasingly interested in turning that intuition into systems.",
      },
      {
        name: 'Espresso',
        joke: true,
        story:
          'I recently moved from occasional pour-over to making three or four espresso shots a day on a small home machine. Extraction time, ratios, distribution, tamping and milk are all still very much in the "learning what I\'m doing" phase.',
      },
      {
        name: 'Podcasting',
        joke: true,
        story:
          'I started a podcast because I wanted another medium for thinking out loud, but there are not many published episodes yet. The part I already know I enjoy is expression; the craft around it-better topics, scripts, editing, guests and perhaps video-is still something I need to build deliberately.',
      },
    ],
  },
  {
    level: 'curious',
    label: 'Curious',
    tools: [
      {
        name: 'iOS Development',
        story:
          'I haven\'t written Swift yet. I live almost entirely inside Apple\'s hardware and software ecosystem, and building something native for the platforms I use every day feels less like an "if" than a "when".',
      },
      {
        name: 'Game Design',
        joke: true,
        story:
          'What interests me about games is not engines or rendering so much as rules, interactions and the behaviour they produce. I\'m especially interested in how small mechanical constraints can create social dynamics, mistakes, conflict and comedy between players.',
      },
      {
        name: 'Creative Coding',
        joke: true,
        story:
          "I'm drawn to the point where code stops being infrastructure and starts producing a visual language of its own. Procedural graphics, strict pixel-based systems and generative visual elements all appeal to me, although for now I'm still much closer to experimenting with hand-drawn web details than making actual generative art.",
      },
    ],
  },
]

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function chars(s) {
  return Array.from(s)
}

function measure(items) {
  const html = `<!doctype html><meta charset="utf-8"><svg xmlns="http://www.w3.org/2000/svg"><text id="t" font-family="${FONT}"></text></svg><pre id="out"></pre><script>
const items = ${JSON.stringify(items)};
const t = document.getElementById('t');
const result = {};
for (const item of items) {
  t.setAttribute('font-size', String(item.size));
  t.setAttribute('font-style', item.italic ? 'italic' : 'normal');
  t.setAttribute('font-weight', item.weight || '400');
  const prefixes = [];
  let built = '';
  for (const ch of Array.from(item.text)) {
    built += ch;
    t.textContent = built;
    prefixes.push(t.getComputedTextLength());
  }
  result[item.id] = prefixes;
}
document.getElementById('out').textContent = JSON.stringify(result);
</script>`
  writeFileSync('/tmp/profile-measure.html', html)
  const chrome = spawnSync(
    'google-chrome',
    [
      '--headless',
      '--disable-gpu',
      '--no-sandbox',
      '--virtual-time-budget=4000',
      '--dump-dom',
      '/tmp/profile-measure.html',
    ],
    { encoding: 'utf8', timeout: 30000 },
  )
  if (chrome.status !== 0) throw new Error(chrome.stderr || 'chrome measure failed')
  const m = chrome.stdout.match(/<pre id="out">([\s\S]*?)<\/pre>/)
  if (!m) throw new Error('measure output missing')
  return JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'))
}

function styleBlock(theme, caretCss, duration) {
  return `<style>
    .ch, .note, .mark, .icon { animation: stream-in ${FADE}s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: var(--d); }
    .caret { opacity: 0; }
    @keyframes stream-in { from { opacity: 0; } to { opacity: 1; } }
    @media (prefers-reduced-motion: no-preference) {
      .caret { opacity: 1; animation: caret-move ${duration.toFixed(3)}s linear both; }
    }
    @keyframes caret-move {
${caretCss}
    }
    @media (prefers-reduced-motion: reduce) {
      .ch, .note, .mark, .icon { animation: none; opacity: 1; }
      .caret { animation: none; opacity: 0; }
    }
  </style>`
}

function textOpen(y, size, extra = '') {
  return `<text xml:space="preserve" x="0" y="${y}" font-family="${FONT}" font-size="${size}" ${extra}>`
}

function streamText(line, y, size, t0, sameParagraph, fill) {
  const glyphs = chars(line)
  let t = t0
  if (!sameParagraph) t += t0 === 0 ? 0 : BREAK
  const parts = []
  const events = []
  glyphs.forEach((ch, i) => {
    const delay = t
    parts.push(`<tspan class="ch" fill="${fill}" style="--d:${delay.toFixed(3)}s">${esc(ch)}</tspan>`)
    events.push({ t: delay, index: i })
    t += INTERVAL
  })
  return { svg: `${textOpen(y, size)}${parts.join('')}</text>`, t, events, glyphs }
}

function buildBio(theme, widths) {
  const lineStep = 36
  const paraStep = 56
  let y = 24
  let t = 0
  const chunks = []
  const caretEvents = []
  let qDelay = 0
  let froqX = 0
  let froqW = 0
  const first = paras[0][0]
  const froqAt = first.indexOf('froQ')

  paras.forEach((lines, pi) => {
    lines.forEach((line, li) => {
      const prefixes = widths[`${pi}-${li}`]
      const same = li > 0
      const startT = t + (pi > 0 && li === 0 ? BREAK : 0)
      const built = streamText(line, y, SIZE, pi === 0 && li === 0 ? 0 : t, same || pi === 0, theme.ink)
      // streamText adds BREAK when t0 !== 0 and !sameParagraph. Call it carefully.
      chunks.push(built.svg)
      built.events.forEach((e) => {
        caretEvents.push({ t: e.t, x: prefixes[e.index], y: y + 2 })
      })
      t = built.t
      if (pi === 0) {
        qDelay = built.events[froqAt + 3].t
        froqX = froqAt === 0 ? 0 : prefixes[froqAt - 1]
        froqW = prefixes[froqAt + 3] - froqX
      }
      y += li === lines.length - 1 ? paraStep : lineStep
      void startT
    })
  })

  const end = t
  const holaW = widths['0-0'].at(-1)
  const noteSize = Math.round(SIZE * 0.62 * 10) / 10
  const noteW = widths.note.at(-1)
  const arrow = inkArrowPath('frog-maybe', 'right')
  const rule = inkRulePath('profile-froq', Math.max(28, froqW), 1)
  const width = Math.ceil(Math.max(holaW + 18 + 16 + 8 + noteW, ...paras.flatMap((lines, pi) => lines.map((_, li) => widths[`${pi}-${li}`].at(-1))))) + 16
  const height = y - paraStep + 16

  const caretCss = caretFrames(caretEvents, end + 0.22)
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">
  ${styleBlock(theme, caretCss, end + 0.22)}
  ${chunks.join('\n  ')}
  <g class="mark" style="--d:${qDelay.toFixed(3)}s" opacity="0.48">
    <g transform="translate(${froqX.toFixed(2)} ${(24 + 1).toFixed(2)})">
      <path d="${rule}" fill="none" stroke="${theme.accent}" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  </g>
  <g class="note" style="--d:${(end + 0.04).toFixed(3)}s">
    <g transform="translate(${(holaW + 16).toFixed(2)} ${24 - 13})" stroke="${theme.ink}" fill="none" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
      <g transform="scale(0.9)">
        <path d="${arrow}"/>
      </g>
    </g>
    <text x="${(holaW + 36).toFixed(2)}" y="24" font-family="${FONT}" font-size="${noteSize}" font-style="italic" fill="${theme.muted}">${esc(NOTE)}</text>
  </g>
  <rect class="caret" x="0" y="0" width="8" height="2.2" rx="0.4" fill="${theme.accent}" opacity="0"/>
</svg>
`
  return { svg, width, height, end }
}

function streamTextFixed(line, y, size, tStart, fill) {
  const glyphs = chars(line)
  let t = tStart
  const parts = []
  const events = []
  glyphs.forEach((ch, i) => {
    parts.push(`<tspan class="ch" fill="${fill}" style="--d:${t.toFixed(3)}s">${esc(ch)}</tspan>`)
    events.push({ t, index: i })
    t += INTERVAL
  })
  return { svg: `${textOpen(y, size)}${parts.join('')}</text>`, t, events }
}

function caretFrames(events, total) {
  const lines = []
  const last = events[events.length - 1]
  for (const e of events) {
    const pct = Math.min(99.2, (e.t / total) * 100)
    lines.push(
      `      ${pct.toFixed(2)}% { transform: translate(${e.x.toFixed(1)}px, ${(e.y).toFixed(1)}px); opacity: 1; }`,
    )
  }
  lines.push(
    `      100% { transform: translate(${last.x.toFixed(1)}px, ${last.y.toFixed(1)}px); opacity: 0; }`,
  )
  return lines.join('\n')
}

function lineSvg(theme, { text, y, width, height, prefixes, tStart, underline, icon }) {
  const built = streamTextFixed(text, y, SIZE, tStart, theme.ink)
  const events = built.events.map((e) => ({ t: e.t, x: (icon ? 26 : 0) + prefixes[e.index], y: y + 2 }))
  const total = built.t + 0.2
  const bits = [styleBlock(theme, caretFrames(events, total), total)]
  if (icon) {
    bits.push(`<g class="icon" style="--d:${tStart.toFixed(3)}s" transform="translate(0 ${y - 16})" fill="none" stroke="${theme.ink}" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round">
    <path d="${inkClipboardBoardPath('profile-cv')}"/>
    <path d="${inkClipboardClipPath('profile-cv')}"/>
    <path d="${inkClipboardLinesPath('profile-cv')}"/>
  </g>`)
    bits.push(built.svg.replace('x="0"', 'x="26"'))
  } else bits.push(built.svg)
  if (underline) {
    const d = inkRulePath(underline.seed, Math.max(24, underline.w), 1)
    bits.push(`<g class="mark" style="--d:${(tStart + underline.at * INTERVAL).toFixed(3)}s" opacity="0.72">
      <g transform="translate(${underline.x.toFixed(2)} ${(y + 2).toFixed(2)})">
        <path d="${d}" fill="none" stroke="${theme.accent}" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
    </g>`)
  }
  bits.push(`<rect class="caret" x="0" y="0" width="8" height="2.2" rx="0.4" fill="${theme.accent}" opacity="0"/>`)
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">
  ${bits.join('\n  ')}
</svg>
`
}

function ruleSvg(stroke) {
  const d = inkRulePath('profile-hr', 120, 4)
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="120" height="8" viewBox="0 0 120 8" role="separator" aria-hidden="true">
  <path d="${d}" fill="none" stroke="${stroke}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`
}

function stackHead(theme) {
  const d = inkRulePath('stack', 80, 2)
  const w = 280
  const h = 128
  return {
    width: w,
    svg: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img">
  <text x="0" y="36" font-family="${FONT}" font-size="36" fill="${theme.ink}">Stack</text>
  <path d="${d}" transform="translate(0 48)" fill="none" stroke="${theme.accent}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="0" y="86" font-family="${FONT}" font-size="16" font-style="italic" fill="${theme.accent}" fill-opacity="0.85">fluent → curious</text>
  <text x="0" y="112" font-family="${FONT}" font-size="16" font-style="italic" fill="${theme.accent}" fill-opacity="0.85">no ranks</text>
</svg>
`,
  }
}

function stackRow(theme, group, width) {
  const h = 64
  const sep = `<tspan font-style="normal" fill="${theme.muted}" fill-opacity="0.45"> · </tspan>`
  const names = group.tools
    .map((tool) => `<tspan fill="${tool.joke ? theme.wry : theme.muted}">${esc(tool.name)}</tspan>`)
    .join(sep)
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${h}" viewBox="0 0 ${width} ${h}" role="img">
  <text x="0" y="24" font-family="${FONT}" font-size="22" fill="${theme.ink}">${esc(group.label)}</text>
  <text xml:space="preserve" x="0" y="50" font-family="${FONT}" font-size="15" font-style="italic">${names}</text>
</svg>
`
}

function stackLink(theme) {
  const d = inkArrowPath('stack-link', 'right')
  const w = 168
  const h = 28
  return {
    width: w,
    svg: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img">
  <text x="0" y="18" font-family="${FONT}" font-size="16" font-style="italic" fill="${theme.accent}">see full stack</text>
  <g transform="translate(142 2) scale(0.85)" fill="none" stroke="${theme.accent}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="${d}"/>
  </g>
</svg>
`,
  }
}

function picture(srcBase, alt, width) {
  return `<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/${srcBase}-dark.svg">
  <img alt="${esc(alt)}" src="assets/${srcBase}-light.svg" width="${width}">
</picture>`
}

function storyMd(text) {
  return text
    .split('`')
    .map((part, i) => (i % 2 ? `\`${part}\`` : part))
    .join('')
}

const items = []
paras.forEach((lines, pi) => lines.forEach((text, li) => items.push({ id: `${pi}-${li}`, text, size: SIZE })))
items.push({ id: 'note', text: NOTE, size: Math.round(SIZE * 0.62 * 10) / 10, italic: true })
items.push({ id: 'cv', text: CV, size: SIZE })
items.push({ id: 'sponsor', text: SPONSOR, size: SIZE })
for (const group of groups) {
  const line = group.tools.map((t) => t.name).join(' · ')
  items.push({ id: `row-${group.level}`, text: line, size: 15, italic: true })
}

const widths = measure(items)

let bioEnd = 0
let bioWidth = 0
mkdirSync('assets', { recursive: true })

for (const [name, theme] of Object.entries(THEMES)) {
  const bio = buildBio(theme, widths)
  bioEnd = bio.end
  bioWidth = bio.width
  writeFileSync(`assets/bio-${name}.svg`, bio.svg)

  const cvPrefixes = widths.cv
  const myCvW = cvPrefixes[chars('My CV').length - 1]
  writeFileSync(
    `assets/cv-${name}.svg`,
    lineSvg(theme, {
      text: CV,
      y: 40,
      width: Math.ceil(26 + cvPrefixes.at(-1) + 8),
      height: 56,
      prefixes: cvPrefixes,
      tStart: bio.end + BREAK,
      icon: true,
      underline: { seed: 'profile-cv-word', x: 26, w: myCvW, at: 0 },
    }),
  )

  const sp = widths.sponsor
  const pre = chars('Sponsor me on ').length
  const word = chars('爱发电').length
  const x0 = sp[pre - 1]
  const x1 = sp[pre + word - 1]
  writeFileSync(
    `assets/sponsor-${name}.svg`,
    lineSvg(theme, {
      text: SPONSOR,
      y: 36,
      width: Math.ceil(sp.at(-1) + 8),
      height: 52,
      prefixes: sp,
      tStart: bio.end + BREAK + chars(CV).length * INTERVAL + BREAK,
      underline: { seed: 'profile-afdian', x: x0, w: x1 - x0, at: pre },
    }),
  )

  writeFileSync(`assets/rule-${name}.svg`, ruleSvg(theme.muted))
  const head = stackHead(theme)
  writeFileSync(`assets/stack-head-${name}.svg`, head.svg)
  for (const group of groups) {
    const rowW = Math.ceil(widths[`row-${group.level}`].at(-1) + 8)
    writeFileSync(`assets/stack-${group.level}-${name}.svg`, stackRow(theme, group, rowW))
  }
  const link = stackLink(theme)
  writeFileSync(`assets/stack-link-${name}.svg`, link.svg)
}

const alt = [
  "Hola! I'm froQ. frog (maybe).",
  "I'm doing a master's degree, which is not the point at all.",
  'I code, build, read, write, and plenty of other stuff.',
  'Most of the time I have a thing for aesthetics—and how things feel to use.',
  'My dream job is to work on the intersection of design and development. If possible, I want to be a full-time open source contributor.',
].join(' ')

const blocks = [
  picture('bio', alt, bioWidth),
  '<br>',
  `<a href="https://froq.me/cv">`,
  picture('cv', CV, Math.ceil(26 + widths.cv.at(-1) + 8)),
  `</a>`,
  '<br>',
  `<a href="https://afdian.com/a/froq-sponsor-me">`,
  picture('sponsor', SPONSOR, Math.ceil(widths.sponsor.at(-1) + 8)),
  `</a>`,
  '<br>',
  picture('rule', '', 120),
  '<br>',
  picture('stack-head', 'Stack. fluent → curious. no ranks.', 280),
  '<br>',
]

for (const group of groups) {
  const label = `${group.label}. ${group.tools.map((t) => t.name).join(' · ')}`
  const rowW = Math.ceil(widths[`row-${group.level}`].at(-1) + 8)
  blocks.push('<details>')
  blocks.push('<summary>')
  blocks.push(picture(`stack-${group.level}`, label, rowW))
  blocks.push('</summary>')
  blocks.push('')
  for (const tool of group.tools) {
    blocks.push(`**${tool.name}**`)
    blocks.push('')
    blocks.push(storyMd(tool.story))
    blocks.push('')
  }
  blocks.push('</details>')
  blocks.push('')
}

blocks.push(`<a href="https://froq.me/stack">`)
blocks.push(picture('stack-link', 'see full stack', 168))
blocks.push(`</a>`)
blocks.push('<br>')
blocks.push(picture('stats', 'contributions in the past year', 360))
blocks.push('')

writeFileSync('README.md', blocks.join('\n'))
console.log(`bio ${bioWidth}px, stream ends ${bioEnd.toFixed(2)}s`)
