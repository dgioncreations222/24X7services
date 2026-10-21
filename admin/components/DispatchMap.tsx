'use client'

import { useMemo, useState } from 'react'
import { APPLIANCE_LABEL, BRAND_LABEL } from '@/lib/catalog'
import { cn } from '@/lib/cn'
import { time } from '@/lib/format'
import { AREAS } from '@/lib/seed'
import { BOOKING_STATUS, LIVE, PRESENCE } from '@/lib/status'
import type { Booking, Technician } from '@/lib/types'

/**
 * A schematic of the service city — no tiles, no map library. Areas are
 * placed by their real coordinates on a light grid, so who is near whom reads
 * correctly even though roads are not drawn.
 */

const PAD = 0.018
const lats = AREAS.map((a) => a.lat)
const lngs = AREAS.map((a) => a.lng)
const BOUNDS = {
  minLat: Math.min(...lats) - PAD,
  maxLat: Math.max(...lats) + PAD,
  minLng: Math.min(...lngs) - PAD,
  maxLng: Math.max(...lngs) + PAD,
}
const W = 1000
const H = 720

function project(lat: number, lng: number) {
  return {
    x: ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * W,
    y: (1 - (lat - BOUNDS.minLat) / (BOUNDS.maxLat - BOUNDS.minLat)) * H,
  }
}

export interface MapLayers {
  techs: boolean
  offline: boolean
  bookings: boolean
}

type Pin = { kind: 'booking'; b: Booking } | { kind: 'tech'; t: Technician }

export function DispatchMap({
  bookings,
  technicians,
  layers,
  onOpen,
  customerName,
}: {
  bookings: Booking[]
  technicians: Technician[]
  layers: MapLayers
  onOpen: (bookingId: string) => void
  customerName: (id: string) => string | undefined
}) {
  const [hover, setHover] = useState<Pin | null>(null)

  // Only technicians who share their location are drawn; dispatch sees the rest in the table.
  const techs = technicians.filter((t) => t.kyc === 'verified' && t.tracking && layers.techs && (layers.offline || t.presence !== 'offline'))
  const routes = useMemo(
    () =>
      bookings
        .filter((b) => LIVE.includes(b.status) && b.technicianId)
        .map((b) => ({ b, t: technicians.find((t) => t.id === b.technicianId) }))
        .filter((r): r is { b: Booking; t: Technician } => !!r.t && r.t.tracking),
    [bookings, technicians]
  )

  const pinColor = (b: Booking) =>
    b.priority === 'emergency' && b.status === 'confirmed' ? 'var(--color-danger)' : b.status === 'confirmed' ? 'var(--color-warning)' : LIVE.includes(b.status) ? 'var(--color-violet)' : 'var(--color-brand)'

  const hp = hover ? (hover.kind === 'booking' ? project(hover.b.lat, hover.b.lng) : project(hover.t.lat, hover.t.lng)) : null

  return (
    <div className="relative overflow-hidden rounded-b-card bg-map-ground">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Map of technicians and open bookings across Hyderabad">
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M50 0H0V50" fill="none" stroke="var(--color-map-grid)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#grid)" />
        {/* Hussain Sagar, as the landmark everyone orients by. */}
        {(() => {
          const p = project(17.4239, 78.4738)
          return <ellipse cx={p.x} cy={p.y} rx="34" ry="22" fill="var(--color-map-water)" />
        })()}
        {/* Outer Ring Road, loosely. */}
        <ellipse cx={W * 0.5} cy={H * 0.52} rx={W * 0.43} ry={H * 0.42} fill="none" stroke="var(--color-map-road)" strokeWidth="6" strokeDasharray="2 10" strokeLinecap="round" />

        {AREAS.map((a) => {
          const p = project(a.lat, a.lng)
          return (
            <g key={a.area}>
              <circle cx={p.x} cy={p.y} r="54" fill="var(--color-map-zone)" opacity="0.7" />
              <text x={p.x} y={p.y + 4} textAnchor="middle" className="fill-map-label text-[15px] font-bold uppercase tracking-wider" style={{ letterSpacing: '0.06em' }}>
                {a.area}
              </text>
            </g>
          )
        })}

        {routes.map(({ b, t }) => {
          const a = project(t.lat, t.lng)
          const z = project(b.lat, b.lng)
          return <line key={b.id} x1={a.x} y1={a.y} x2={z.x} y2={z.y} stroke="var(--color-violet)" strokeWidth="2.5" strokeDasharray="7 7" className="animate-route" opacity="0.7" />
        })}

        {techs.map((t) => {
          const p = project(t.lat, t.lng)
          const fill = t.presence === 'on_job' ? 'var(--color-violet)' : t.presence === 'online' ? 'var(--color-success)' : 'var(--color-map-label)'
          return (
            <g key={t.id} onMouseEnter={() => setHover({ kind: 'tech', t })} onMouseLeave={() => setHover(null)} className="cursor-default">
              <circle cx={p.x} cy={p.y} r="16" fill="transparent" />
              <circle cx={p.x} cy={p.y} r="8.5" fill={fill} stroke="var(--color-white)" strokeWidth="3" />
            </g>
          )
        })}

        {layers.bookings &&
          bookings.map((b) => {
            const p = project(b.lat, b.lng)
            const c = pinColor(b)
            const urgent = b.priority === 'emergency' && b.status === 'confirmed'
            return (
              <g
                key={b.id}
                transform={`translate(${p.x} ${p.y})`}
                onMouseEnter={() => setHover({ kind: 'booking', b })}
                onMouseLeave={() => setHover(null)}
                onClick={() => onOpen(b.id)}
                className="cursor-pointer"
                role="button"
                aria-label={`${b.id}, ${BOOKING_STATUS[b.status].label}`}
              >
                {urgent && (
                  <circle r="14" fill="var(--color-danger)" opacity="0.35">
                    <animate attributeName="r" values="12;30" dur="1.6s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.45;0" dur="1.6s" repeatCount="indefinite" />
                  </circle>
                )}
                <path d="M0 0 C-11 -14 -12 -20 -12 -24 A12 12 0 1 1 12 -24 C12 -20 11 -14 0 0Z" fill={c} stroke="var(--color-white)" strokeWidth="2.5" />
                <circle cy="-24" r="4.5" fill="var(--color-white)" />
              </g>
            )
          })}
      </svg>

      {hover && hp && (
        <div
          className="pointer-events-none absolute z-10 w-60 -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-card px-3 py-2.5 text-xs shadow-float"
          style={{ left: `${(hp.x / W) * 100}%`, top: `calc(${(hp.y / H) * 100}% - ${hover.kind === 'booking' ? 34 : 14}px)` }}
        >
          {hover.kind === 'booking' ? (
            <>
              <p className="flex items-center justify-between gap-2 font-extrabold">
                {hover.b.id}
                <span className={cn('font-bold', hover.b.priority === 'emergency' ? 'text-danger' : 'text-muted')}>{BOOKING_STATUS[hover.b.status].label}</span>
              </p>
              <p className="mt-0.5 font-semibold text-ink-2">
                {BRAND_LABEL[hover.b.brand]} {APPLIANCE_LABEL[hover.b.appliance]} · {time(hover.b.scheduledAt)}
              </p>
              <p className="truncate text-muted">
                {customerName(hover.b.customerId)} · {hover.b.area}
              </p>
            </>
          ) : (
            <>
              <p className="font-extrabold">{hover.t.name}</p>
              <p className="font-semibold text-muted">
                {PRESENCE[hover.t.presence].label} · {hover.t.area} · ★ {hover.t.rating.toFixed(2)}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
