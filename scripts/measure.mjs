import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

// Gelasio is metric-compatible with Georgia, so its advance widths predict how
// GitHub lays out the SVG text. CJK falls back to one em per glyph.
const require = createRequire(import.meta.url)
const opentype = require('opentype.js')
const file = require.resolve('@fontsource/gelasio/files/gelasio-latin-400-normal.woff')
const buf = readFileSync(file)
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))

export function textWidth(text, size) {
  let width = 0
  for (const ch of text) {
    if (/[\u2e80-\u9fff\uff00-\uffef]/.test(ch)) width += size
    else width += font.getAdvanceWidth(ch, size)
  }
  return width
}
