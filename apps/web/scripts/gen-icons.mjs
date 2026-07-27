/**
 * Generates PNG icons for the PWA manifest.
 * Run: node scripts/gen-icons.mjs
 */
import { PNG } from 'pngjs'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = __dirname + '/../public'

const EMERALD = { r: 0x04, g: 0x78, b: 0x57 }

function makeIcon(size, maskable = false) {
  const png = new PNG({ width: size, height: size })
  const bg = maskable ? EMERALD : { r: 0xf8, g: 0xfa, b: 0xfc }
  const inset = maskable ? 0 : Math.round(size * 0.1)
  const w = size - 2 * inset
  // Background fill (full bleed for maskable safe zone)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2
      png.data[idx] = bg.r
      png.data[idx + 1] = bg.g
      png.data[idx + 2] = bg.b
      png.data[idx + 3] = 0xff
    }
  }
  // Centered white disk + emerald ring (icon safe zone)
  const cx = size / 2
  const cy = size / 2
  const radius = w / 2
  const innerR = radius * 0.78
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx
      const dy = y - cy
      const d = Math.sqrt(dx * dx + dy * dy)
      const idx = (size * y + x) << 2
      if (d <= innerR) {
        // white disk
        png.data[idx] = 0xff
        png.data[idx + 1] = 0xff
        png.data[idx + 2] = 0xff
        png.data[idx + 3] = 0xff
      } else if (d <= innerR + 2) {
        // emerald ring outline
        png.data[idx] = EMERALD.r
        png.data[idx + 1] = EMERALD.g
        png.data[idx + 2] = EMERALD.b
        png.data[idx + 3] = 0xff
      }
    }
  }
  return png
}

function writePng(png, file) {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, PNG.sync.write(png))
  console.log('wrote', file)
}

writePng(makeIcon(192), `${publicDir}/icon-192.png`)
writePng(makeIcon(512), `${publicDir}/icon-512.png`)
writePng(makeIcon(512, true), `${publicDir}/icon-512-maskable.png`)
console.log('done')