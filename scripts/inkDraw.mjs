// Port of the ink helpers the profile assets use.
// Source of truth: 0froq/0froq.github.io app/utils/inkDraw.ts

export function hashSeed(input) {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 2147483646) + 1
}

export function inkRng(seed) {
  let a = (typeof seed === 'number' ? seed : hashSeed(seed)) >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function inkStrokePath(pts) {
  if (pts.length < 2) return ''
  if (pts.length === 2)
    return `M${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)} L${pts[1][0].toFixed(2)} ${pts[1][1].toFixed(2)}`

  let d = `M${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`
  }
  return d
}

export function inkArrowPath(seed, dir = 'up') {
  const rng = inkRng(`ink-arrow:v1:${dir}:${seed}`)
  const jitter = () => (rng() - 0.5) * 0.9
  const mid = 8 + jitter() * 0.4
  const wing = 4.2 + rng() * 0.8
  const lift = 3.4 + rng() * 0.7
  const bow = 0.4 + rng() * 0.5
  const left = [mid - wing + jitter(), 8 + lift + jitter()]
  const tip = [mid + jitter() * 0.3, 8 - lift + jitter()]
  const right = [mid + wing + jitter(), 8 + lift + jitter()]
  const thru = [tip[0] + (right[0] - left[0]) * 0.02, tip[1] + bow]
  const pts = [left, tip, thru, right]
  if (dir === 'down') return inkStrokePath(pts.map(([x, y]) => [x, 16 - y]))
  if (dir === 'left') return inkStrokePath(pts.map(([x, y]) => [y, x]))
  if (dir === 'right') return inkStrokePath(pts.map(([x, y]) => [16 - y, x]))
  return inkStrokePath(pts)
}

export function inkRulePath(seed, width = 120, pad = 4) {
  const rng = inkRng(`ink-rule:v1:${seed}`)
  const pts = []
  const n = 5
  const span = Math.max(1, width - pad * 2)
  for (let i = 0; i <= n; i++) {
    pts.push([pad + (i / n) * span + (rng() - 0.5) * 1.4, 4 + (rng() - 0.5) * 1.6])
  }
  return inkStrokePath(pts)
}

export function inkWobbleBox(seed, x0, y0, x1, y1, jitter = 0.7, steps = 3) {
  const rng = inkRng(`ink-wobble-box:v1:${seed}`)
  const j = () => (rng() - 0.5) * jitter * 2
  const pts = []
  const edge = (ax, ay, bx, by, skipStart) => {
    for (let i = skipStart ? 1 : 0; i <= steps; i++) {
      const t = i / steps
      pts.push([ax + (bx - ax) * t + j(), ay + (by - ay) * t + j()])
    }
  }
  edge(x0, y0, x1, y0, false)
  edge(x1, y0, x1, y1, true)
  edge(x1, y1, x0, y1, true)
  edge(x0, y1, x0, y0, true)
  pts.push(pts[0])
  return inkStrokePath(pts)
}

export function inkClipboardBoardPath(seed) {
  return inkWobbleBox(`${seed}:board`, 4.1, 5.2, 13.9, 16.2, 0.42, 2)
}

export function inkClipboardClipPath(seed) {
  const rng = inkRng(`ink-clipboard:v1:${seed}`)
  const j = () => (rng() - 0.5) * 0.38
  return [
    inkStrokePath([
      [6.7 + j(), 5.4 + j()],
      [6.7 + j(), 2.5 + j()],
      [11.3 + j(), 2.5 + j()],
      [11.3 + j(), 5.4 + j()],
    ]),
    inkStrokePath([
      [7.6 + j(), 3.7 + j()],
      [10.4 + j(), 3.7 + j()],
    ]),
  ].join(' ')
}

export function inkClipboardLinesPath(seed) {
  const rng = inkRng(`ink-clipboard-lines:v1:${seed}`)
  const j = () => (rng() - 0.5) * 0.38
  return [
    inkStrokePath([
      [6.2 + j(), 8.1 + j()],
      [11.8 + j(), 8.2 + j()],
    ]),
    inkStrokePath([
      [6.3 + j(), 10.5 + j()],
      [11.6 + j(), 10.4 + j()],
    ]),
    inkStrokePath([
      [6.2 + j(), 12.9 + j()],
      [10.2 + j(), 13.0 + j()],
    ]),
  ].join(' ')
}
