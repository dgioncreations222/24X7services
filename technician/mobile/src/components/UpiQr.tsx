import { useMemo } from 'react'
import { View } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import QRCode from 'qrcode'
import { File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { cn } from '@/lib/cn'
import { COLORS } from '@/lib/theme'

/**
 * The standard UPI payment link every UPI app (GPay, PhonePe, Paytm, BHIM)
 * reads from a QR. With an amount it opens pre-filled; without one the
 * customer types it, like a shop's counter scanner.
 */
export function upiLink({ upi, name, amount, note }: { upi: string; name: string; amount?: number; note?: string }) {
  // Built by hand rather than with URLSearchParams: some UPI apps show "+"
  // for spaces and reject "%40" in the payee address.
  const enc = (v: string) => encodeURIComponent(v).replace(/%40/g, '@')
  const q = [`pa=${enc(upi)}`, `pn=${enc(name)}`, 'cu=INR']
  if (amount) q.push(`am=${amount.toFixed(2)}`)
  if (note) q.push(`tn=${enc(note)}`)
  return `upi://pay?${q.join('&')}`
}

/**
 * A real, scannable QR for `text`, drawn as one SVG path so it stays crisp at any size.
 * The SVG fills the box `className` gives it (e.g. `aspect-square w-full max-w-[216px]`).
 */
export function QrCode({ text, className, label = 'Payment QR code' }: { text: string; className?: string; label?: string }) {
  const { size, d } = useMemo(() => {
    const { modules } = QRCode.create(text, { errorCorrectionLevel: 'M' })
    let path = ''
    for (let y = 0; y < modules.size; y++)
      for (let x = 0; x < modules.size; x++) if (modules.get(y, x)) path += `M${x} ${y}h1v1h-1z`
    return { size: modules.size, d: path }
  }, [text])

  return (
    <View accessibilityRole="image" accessibilityLabel={label} className={cn('aspect-square overflow-hidden rounded-xl bg-white', className)}>
      <Svg width="100%" height="100%" viewBox={`-2 -2 ${size + 4} ${size + 4}`}>
        <Path d={d} fill={COLORS.qrInk} />
      </Svg>
    </View>
  )
}

/**
 * Saves the QR as a PNG the technician can print or send. A phone has no
 * download folder to drop it in, so the PNG is written to the cache and
 * handed to the share sheet (Save to Files / Photos, WhatsApp, print…).
 * qrcode's own toDataURL needs a canvas, so the PNG is encoded here.
 */
export async function downloadQr(text: string, filename: string) {
  const bytes = qrPng(text, 1024, 2)
  const file = new File(Paths.cache, filename.endsWith('.png') ? filename : `${filename}.png`)
  if (file.exists) file.delete()
  file.create()
  file.write(bytes)
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: filename })
  }
}

/* ------------------------------------------------- A tiny PNG encoder */

/**
 * A 1-bit greyscale PNG of the QR, `width` px square with a `margin`-module
 * quiet zone — the qr-ink token cannot be expressed in 1-bit grey, so dark modules
 * are black, which every scanner and printer prefers anyway. The pixel data
 * goes in uncompressed ("stored") deflate blocks: no zlib needed, and at
 * 1 bit per pixel a 1024 px QR is still only ~130 KB.
 */
function qrPng(text: string, width: number, margin: number): Uint8Array {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: 'M' })
  const n = modules.size
  const total = n + margin * 2
  const rowBytes = Math.ceil(width / 8)
  const raw = new Uint8Array((rowBytes + 1) * width)
  for (let py = 0; py < width; py++) {
    const my = Math.floor((py * total) / width) - margin
    const row = py * (rowBytes + 1)
    raw[row] = 0 // filter: none
    for (let px = 0; px < width; px++) {
      const mx = Math.floor((px * total) / width) - margin
      const dark = mx >= 0 && my >= 0 && mx < n && my < n && modules.get(my, mx)
      // 1 = white in greyscale; dark modules leave their bit at 0.
      const at = row + 1 + (px >> 3)
      if (!dark) raw[at] = raw[at]! | (0x80 >> (px & 7))
    }
  }

  const ihdr = new Uint8Array(13)
  const dv = new DataView(ihdr.buffer)
  dv.setUint32(0, width)
  dv.setUint32(4, width)
  ihdr[8] = 1 // bit depth
  ihdr[9] = 0 // greyscale
  return concat([
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlibStored(raw)),
    chunk('IEND', new Uint8Array(0)),
  ])
}

function zlibStored(data: Uint8Array): Uint8Array {
  const parts: Uint8Array[] = [new Uint8Array([0x78, 0x01])]
  for (let i = 0; i < data.length || i === 0; i += 65535) {
    const block = data.subarray(i, Math.min(i + 65535, data.length))
    const last = i + 65535 >= data.length ? 1 : 0
    const len = block.length
    parts.push(new Uint8Array([last, len & 0xff, len >> 8, ~len & 0xff, (~len >> 8) & 0xff]), block)
  }
  let a = 1
  let b = 0
  for (let i = 0; i < data.length; i++) {
    a = (a + data[i]!) % 65521
    b = (b + a) % 65521
  }
  const adler = new Uint8Array(4)
  new DataView(adler.buffer).setUint32(0, ((b << 16) | a) >>> 0)
  parts.push(adler)
  return concat(parts)
}

let CRC_TABLE: Uint32Array | undefined
function crc32(bytes: Uint8Array): number {
  if (!CRC_TABLE) {
    CRC_TABLE = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      CRC_TABLE[n] = c >>> 0
    }
  }
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]!) & 0xff]! ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length)
  const dv = new DataView(out.buffer)
  dv.setUint32(0, data.length)
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i)
  out.set(data, 8)
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)))
  return out
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0))
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}
