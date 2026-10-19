import { useEffect, useId, useState } from 'react'
import { View } from 'react-native'
import Svg, { Circle, Defs, G, Path, Pattern, Rect, Text as SvgText } from 'react-native-svg'
import Animated, {
  Easing,
  ReduceMotion,
  cancelAnimation,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import { cn } from '@/lib/cn'
import { BASE } from '@/lib/seed'
import { COLORS } from '@/lib/theme'

/**
 * The service area, drawn.
 *
 * A tile map needs a key and a network, and a technician in a basement car
 * park has neither. This is a vector sketch of west Hyderabad — the arterial
 * roads, the lakes, the ORR — projected from real coordinates, so pins land
 * where the addresses are. Turn-by-turn is handed to Google Maps through the
 * Navigate button; this map's job is orientation: where am I, where is the
 * job, roughly how far.
 */

const W = 1000
const H = 900
const LNG0 = 78.325
const LNG1 = 78.45
const LAT0 = 17.395
const LAT1 = 17.51

export function project(lat: number, lng: number): [number, number] {
  return [((lng - LNG0) / (LNG1 - LNG0)) * W, ((LAT1 - lat) / (LAT1 - LAT0)) * H]
}

type P = [number, number]

const ll = (pts: [number, number][]) => pts.map(([lat, lng]) => project(lat, lng))
const path = (pts: P[]) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')

/* Arterials, roughly traced. */
const MAJOR: P[][] = [
  // Old Mumbai Highway: Gachibowli → Mehdipatnam
  ll([[17.4401, 78.33], [17.4418, 78.3489], [17.4435, 78.3772], [17.4378, 78.4], [17.43, 78.425], [17.425, 78.45]]),
  // NH65: Miyapur → Kukatpally → Balanagar
  ll([[17.5, 78.335], [17.4968, 78.3614], [17.4935, 78.385], [17.4948, 78.3996], [17.487, 78.425], [17.482, 78.45]]),
  // Hitech – Kondapur – Botanical Garden spine
  ll([[17.4968, 78.3614], [17.4812, 78.3625], [17.4712, 78.3571], [17.4585, 78.3668], [17.4483, 78.3915], [17.4326, 78.4071], [17.4156, 78.4347]]),
  // Jubilee Hills Rd 36 → Madhapur → Kukatpally
  ll([[17.4326, 78.4071], [17.445, 78.398], [17.4625, 78.391], [17.4948, 78.3996]]),
  // Gachibowli → Nanakramguda → Manikonda
  ll([[17.4401, 78.3489], [17.4176, 78.3411], [17.41, 78.365], [17.405, 78.3869], [17.412, 78.41]]),
  // ORR, west arc
  ll([[17.51, 78.338], [17.47, 78.332], [17.44, 78.333], [17.41, 78.338], [17.395, 78.35]]),
]

const MINOR: P[][] = [
  ll([[17.4712, 78.3571], [17.463, 78.371], [17.4435, 78.3772]]),
  ll([[17.4812, 78.3625], [17.4625, 78.391]]),
  ll([[17.4585, 78.3668], [17.4401, 78.3489]]),
  ll([[17.4435, 78.3772], [17.4176, 78.3411]]),
  ll([[17.405, 78.3869], [17.4378, 78.4]]),
  ll([[17.4968, 78.3614], [17.4712, 78.34]]),
  ll([[17.4948, 78.3996], [17.47, 78.41], [17.4326, 78.4071]]),
  ll([[17.4156, 78.4347], [17.44, 78.44], [17.487, 78.425]]),
  ll([[17.463, 78.371], [17.47, 78.41]]),
]

const AREAS: { name: string; at: [number, number] }[] = [
  { name: 'MIYAPUR', at: [17.5025, 78.35] },
  { name: 'KUKATPALLY', at: [17.4995, 78.408] },
  { name: 'KONDAPUR', at: [17.476, 78.347] },
  { name: 'KOTHAGUDA', at: [17.466, 78.381] },
  { name: 'HITEC CITY', at: [17.4505, 78.371] },
  { name: 'MADHAPUR', at: [17.4555, 78.4005] },
  { name: 'GACHIBOWLI', at: [17.432, 78.354] },
  { name: 'JUBILEE HILLS', at: [17.4275, 78.412] },
  { name: 'NANAKRAMGUDA', at: [17.411, 78.335] },
  { name: 'MANIKONDA', at: [17.399, 78.382] },
  { name: 'BANJARA HILLS', at: [17.408, 78.433] },
]

export interface MapPin {
  id: string
  lat: number
  lng: number
  label?: string
  tone?: 'brand' | 'danger' | 'success' | 'muted'
  active?: boolean
}

/** A plausible street route: two turns, never a straight line through buildings. */
function route(a: P, b: P): P[] {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  if (Math.abs(dx) > Math.abs(dy)) {
    return [a, [a[0] + dx * 0.35, a[1]], [a[0] + dx * 0.65, b[1]], b]
  }
  return [a, [a[0], a[1] + dy * 0.35], [b[0], a[1] + dy * 0.65], b]
}

function along(pts: P[], t: number): P {
  const segs = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i]![0], p[1] - pts[i]![1]))
  let d = segs.reduce((s, l) => s + l, 0) * Math.min(Math.max(t, 0), 1)
  for (let i = 0; i < segs.length; i++) {
    if (d <= segs[i]!) {
      const k = segs[i] ? d / segs[i]! : 0
      const a = pts[i]!
      const b = pts[i + 1]!
      return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]
    }
    d -= segs[i]!
  }
  return pts[pts.length - 1]!
}

const AnimatedPath = Animated.createAnimatedComponent(Path)
const AnimatedCircle = Animated.createAnimatedComponent(Circle)

/** The web's `animate-route`: the white dashes march along the route. */
function RouteDash({ d, width, dash }: { d: string; width: number; dash: string }) {
  const offset = useSharedValue(0)
  useEffect(() => {
    offset.value = withRepeat(
      withTiming(-40, { duration: 1200, easing: Easing.linear, reduceMotion: ReduceMotion.System }),
      -1,
      false
    )
    return () => cancelAnimation(offset)
  }, [offset])
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: offset.value }))
  return (
    <AnimatedPath
      d={d}
      fill="none"
      stroke={COLORS.white}
      strokeWidth={width}
      strokeDasharray={dash}
      strokeLinecap="round"
      animatedProps={animatedProps}
    />
  )
}

/**
 * The web's `animate-pulse-ring`: the ring grows from 0.8× to 2.4× its radius
 * while fading out. With reduced motion it stays still, as the web's does.
 */
function PulseRing({ r, fill, opacity }: { r: number; fill: string; opacity: number }) {
  const reduce = useReducedMotion()
  const t = useSharedValue(0)
  useEffect(() => {
    if (reduce) return
    t.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.bezier(0.22, 0.61, 0.36, 1), reduceMotion: ReduceMotion.System }),
      -1,
      false
    )
    return () => cancelAnimation(t)
  }, [t, reduce])
  const animatedProps = useAnimatedProps(() => ({
    r: r * (0.8 + 1.6 * t.value),
    opacity: opacity * 0.7 * (1 - t.value),
  }))
  if (reduce) return <Circle r={r} fill={fill} opacity={opacity} />
  return <AnimatedCircle fill={fill} animatedProps={animatedProps} />
}

export function ServiceMap({
  pins = [],
  from,
  to,
  progress = 0,
  className,
  aspect = 16 / 10,
  onPin,
  showBase = true,
  fill,
  insets = [0, 0],
}: {
  pins?: MapPin[]
  /** Technician start for the route. Defaults to the hub. */
  from?: { lat: number; lng: number }
  /** Draws a route when set. */
  to?: { lat: number; lng: number }
  /** 0–1: how far along the route the technician is. */
  progress?: number
  className?: string
  aspect?: number
  onPin?: (id: string) => void
  showBase?: boolean
  /** Fill the parent instead of keeping an aspect ratio. */
  fill?: boolean
  /** Share of the height covered by overlays at the top and bottom. */
  insets?: [number, number]
}) {
  // In fill mode the frame takes the box's own shape, measured on layout.
  const [measured, setMeasured] = useState<number | null>(null)
  if (fill && measured) aspect = measured
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const start = project((from ?? BASE).lat, (from ?? BASE).lng)
  const end = to ? project(to.lat, to.lng) : null
  const r = end ? route(start, end) : null
  const van = r ? along(r, progress) : start

  // Frame what matters: the route if there is one, otherwise every pin.
  const pts: P[] = r ? r : [start, ...pins.map((p) => project(p.lat, p.lng))]
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  let minX = Math.min(...xs)
  let maxX = Math.max(...xs)
  let minY = Math.min(...ys)
  let maxY = Math.max(...ys)
  const pad = 90
  minX -= pad
  maxX += pad
  minY -= pad
  maxY += pad
  let vw = maxX - minX
  let vh = maxY - minY
  // Grow the frame so the route stays in the strip overlays leave uncovered.
  const covered = Math.min(insets[0] + insets[1], 0.8)
  if (covered > 0) {
    const full = vh / (1 - covered)
    minY -= full * insets[0]
    vh = full
  }
  if (vw / vh < aspect) {
    const nw = vh * aspect
    minX -= (nw - vw) / 2
    vw = nw
  } else {
    const nh = vw / aspect
    minY -= (nh - vh) / 2
    vh = nh
  }
  const scale = vw / 1000
  const s = (n: number) => n * Math.max(scale, 0.35)

  return (
    <View
      className={cn('relative overflow-hidden bg-map-land', className)}
      style={fill ? undefined : { aspectRatio: aspect }}
      onLayout={
        fill
          ? (e) => {
              const { width, height } = e.nativeEvent.layout
              if (height) setMeasured(width / height)
            }
          : undefined
      }
      accessibilityRole="image"
      accessibilityLabel="Service area map"
    >
      <Svg viewBox={`${minX} ${minY} ${vw} ${vh}`} width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
        <Defs>
          <Pattern id={`grid-${uid}`} width="28" height="28" patternUnits="userSpaceOnUse" patternTransform="rotate(8)">
            <Path d="M28 0H0V28" fill="none" stroke={COLORS.mapGrid} strokeWidth="1.2" />
          </Pattern>
        </Defs>
        <Rect x={-500} y={-500} width={W + 1000} height={H + 1000} fill={COLORS.mapGround} />
        <Rect x={-500} y={-500} width={W + 1000} height={H + 1000} fill={`url(#grid-${uid})`} />

        {/* Green: University of Hyderabad, KBR Park, Botanical Garden */}
        <Path d={blob(project(17.458, 78.332), 70, 95)} fill={COLORS.mapPark} />
        <Path d={blob(project(17.4235, 78.4165), 34, 30)} fill={COLORS.mapPark} />
        <Path d={blob(project(17.4585, 78.3575), 26, 22)} fill={COLORS.mapPark} />
        {/* Water: Durgam Cheruvu, Khajaguda, Gopi Cheruvu */}
        <Path d={blob(project(17.4295, 78.3895), 16, 44, 0.6)} fill={COLORS.mapWater} />
        <Path d={blob(project(17.418, 78.372), 20, 16)} fill={COLORS.mapWater} />
        <Path d={blob(project(17.4555, 78.346), 14, 12)} fill={COLORS.mapWater} />

        {MINOR.map((p, i) => (
          <Path key={`m${i}`} d={path(p)} fill="none" stroke={COLORS.white} strokeWidth={s(7)} strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {MAJOR.map((p, i) => (
          <G key={`M${i}`}>
            <Path d={path(p)} fill="none" stroke={COLORS.mapRoadEdge} strokeWidth={s(15)} strokeLinecap="round" strokeLinejoin="round" />
            <Path d={path(p)} fill="none" stroke={i === 5 ? COLORS.mapHighway : COLORS.white} strokeWidth={s(11)} strokeLinecap="round" strokeLinejoin="round" />
          </G>
        ))}

        {AREAS.map((a) => {
          const [x, y] = project(...a.at)
          return (
            <SvgText
              key={a.name}
              x={x}
              y={y}
              textAnchor="middle"
              fontSize={s(17)}
              fontFamily="Manrope_800ExtraBold"
              fontWeight="800"
              letterSpacing={s(2.4)}
              fill={COLORS.mapLabel}
            >
              {a.name}
            </SvgText>
          )
        })}

        {r && (
          <>
            <Path d={path(r)} fill="none" stroke={COLORS.brandDeep} strokeOpacity={0.18} strokeWidth={s(22)} strokeLinecap="round" strokeLinejoin="round" />
            <Path d={path(r)} fill="none" stroke={COLORS.brand} strokeWidth={s(9)} strokeLinecap="round" strokeLinejoin="round" />
            <RouteDash d={path(r)} width={s(3)} dash={`${s(4)} ${s(16)}`} />
          </>
        )}

        {pins.map((p) => {
          const [x, y] = project(p.lat, p.lng)
          const color = p.tone === 'danger' ? COLORS.danger : p.tone === 'success' ? COLORS.success : p.tone === 'muted' ? COLORS.faint : COLORS.brand
          const k = s(p.active ? 1.25 : 1)
          return (
            <G key={p.id} transform={`translate(${x} ${y}) scale(${k})`} onPress={onPin ? () => onPin(p.id) : undefined}>
              {p.tone === 'danger' && <PulseRing r={20} fill={color} opacity={0.25} />}
              <Path d="M0 0c-3-9-15-15-15-27a15 15 0 1 1 30 0C15-15 3-9 0 0Z" fill={color} stroke={COLORS.white} strokeWidth="3" />
              <Circle cy="-27" r="5.5" fill={COLORS.white} />
              {p.label && (
                <G transform="translate(0 -52)">
                  <Rect x={-p.label.length * 4.4 - 8} y="-13" width={p.label.length * 8.8 + 16} height="24" rx="6" fill={COLORS.ink} />
                  <SvgText textAnchor="middle" y="4" fontSize="13" fontFamily="Manrope_800ExtraBold" fontWeight="800" fill={COLORS.white}>
                    {p.label}
                  </SvgText>
                </G>
              )}
            </G>
          )
        })}

        {showBase && (
          <G transform={`translate(${van[0]} ${van[1]}) scale(${s(1)})`}>
            <PulseRing r={26} fill={COLORS.brand} opacity={0.16} />
            <Circle r="13" fill={COLORS.white} />
            <Circle r="9" fill={COLORS.brand} />
          </G>
        )}
      </Svg>
    </View>
  )
}

/** A soft closed shape, so parks and lakes are not perfect ellipses. */
function blob([cx, cy]: P, rx: number, ry: number, tilt = 0.2): string {
  const n = 9
  const pts: P[] = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const wobble = 1 + Math.sin(a * 3 + cx) * 0.12
    const x = Math.cos(a) * rx * wobble
    const y = Math.sin(a) * ry * wobble
    pts.push([cx + x * Math.cos(tilt) - y * Math.sin(tilt), cy + x * Math.sin(tilt) + y * Math.cos(tilt)])
  }
  const mid = (a: P, b: P): P => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  let d = `M${mid(pts[n - 1]!, pts[0]!).join(' ')}`
  for (let i = 0; i < n; i++) {
    const p = pts[i]!
    const m = mid(p, pts[(i + 1) % n]!)
    d += ` Q${p[0].toFixed(1)} ${p[1].toFixed(1)} ${m[0].toFixed(1)} ${m[1].toFixed(1)}`
  }
  return d + 'Z'
}
