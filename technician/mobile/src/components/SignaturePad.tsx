import { useMemo, useRef, useState } from 'react'
import { Image, PanResponder, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { Eraser } from 'lucide-react-native'
import { Icon, Tappable, Text } from './ui'
import { COLORS } from '@/lib/theme'

const INK = COLORS.brandInk
const WIDTH = 2.4
const SVG_PREFIX = 'data:image/svg+xml;utf8,'

/**
 * The signature as a self-contained SVG data URL — a phone has no canvas to
 * export a PNG from, and an SVG is both smaller and sharp at any size. To show
 * it elsewhere use expo-image (`<Image source={{ uri }} />` renders SVG) or
 * react-native-svg's `<SvgXml xml={signatureXml(value)} />`; RN's own Image
 * cannot draw SVG.
 */
function toDataUrl(strokes: string[], w: number, h: number) {
  const paths = strokes
    .map((d) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${WIDTH}" stroke-linecap="round" stroke-linejoin="round"/>`)
    .join('')
  const xml = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(w)}" height="${Math.round(h)}" viewBox="0 0 ${Math.round(w)} ${Math.round(h)}">${paths}</svg>`
  return SVG_PREFIX + encodeURIComponent(xml)
}

/** The SVG markup inside a signature data URL, for `<SvgXml>`; '' if it isn't one. */
export function signatureXml(value: string): string {
  if (!value.startsWith(SVG_PREFIX)) return ''
  try {
    return decodeURIComponent(value.slice(SVG_PREFIX.length))
  } catch {
    return ''
  }
}

/** Strokes back out of a saved signature, so returning to the screen shows it. */
function parseStrokes(value: string): string[] {
  return [...signatureXml(value).matchAll(/ d="([^"]*)"/g)].map((m) => m[1]!)
}

const r = (n: number) => Math.round(n * 10) / 10

/**
 * The customer signs with a finger. The pad claims the touch and refuses to
 * hand it back, so the page doesn't scroll under the stroke.
 */
export function SignaturePad({ value, onChange }: { value: string; onChange: (dataUrl: string) => void }) {
  const [strokes, setStrokes] = useState<string[]>(() => parseStrokes(value))
  // A signature saved by the web app (a PNG) is shown as it was until redrawn.
  const [legacy, setLegacy] = useState(() => (value && !value.startsWith(SVG_PREFIX) ? value : ''))
  const [empty, setEmpty] = useState(!value)
  const size = useRef({ w: 0, h: 0 })
  const all = useRef(strokes)
  all.current = strokes
  const live = useRef<string | null>(null)
  const [, redraw] = useState(0)
  const changed = useRef(onChange)
  changed.current = onChange

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: (e) => {
          const { locationX: x, locationY: y } = e.nativeEvent
          live.current = `M${r(x)} ${r(y)}L${r(x + 0.1)} ${r(y + 0.1)}`
          setEmpty(false)
          redraw((n) => n + 1)
        },
        onPanResponderMove: (e) => {
          if (!live.current) return
          const { locationX: x, locationY: y } = e.nativeEvent
          live.current += `L${r(x)} ${r(y)}`
          redraw((n) => n + 1)
        },
        onPanResponderRelease: () => finish(),
        onPanResponderTerminate: () => finish(),
      }),
    [] // eslint-disable-line react-hooks/exhaustive-deps
  )

  function finish() {
    const d = live.current
    live.current = null
    if (!d) return
    const next = [...all.current, d]
    all.current = next
    setStrokes(next)
    setLegacy('')
    changed.current(toDataUrl(next, size.current.w, size.current.h))
  }

  return (
    <View>
      <View
        accessibilityLabel="Customer signature"
        className="h-40 overflow-hidden rounded-xl border-2 border-dashed border-line-strong bg-paper"
        onLayout={(e) => {
          size.current = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height }
        }}
        {...responder.panHandlers}
      >
        {legacy ? (
          <View pointerEvents="none" className="absolute inset-0">
            <Image source={{ uri: legacy }} resizeMode="stretch" className="size-full" />
          </View>
        ) : null}
        {empty && (
          <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
            <Text className="text-sm font-semibold text-faint">Customer signs here</Text>
          </View>
        )}
        <View pointerEvents="none" className="absolute inset-x-6 bottom-8 border-b border-line-strong" />
        <View pointerEvents="none" className="absolute bottom-3 left-6">
          <Text className="text-[11px] font-bold uppercase tracking-wider text-faint">× Signature</Text>
        </View>
        <Svg pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          {[...strokes, ...(live.current ? [live.current] : [])].map((d, i) => (
            <Path key={i} d={d} fill="none" stroke={INK} strokeWidth={WIDTH} strokeLinecap="round" strokeLinejoin="round" />
          ))}
        </Svg>
      </View>
      <Tappable
        onPress={() => {
          live.current = null
          all.current = []
          setStrokes([])
          setLegacy('')
          setEmpty(true)
          onChange('')
        }}
        className="mt-2 h-9 flex-row items-center gap-1.5 self-start rounded-lg px-2 active:bg-canvas active:opacity-100"
      >
        <Icon as={Eraser} className="size-4 text-muted" />
        <Text className="text-sm font-bold text-muted">Clear</Text>
      </Tappable>
    </View>
  )
}
