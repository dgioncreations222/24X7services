'use client'

import { useMemo, useState } from 'react'
import type { AdminBooking, GeoPoint, Partner } from '@/lib/data'
import { cn } from '@/lib/cn'
import { BOOKING_STATUS, slot } from '../bookings/status'

const W = 1000
const H = 680

/**
 * A schematic of the city — no tiles, no map library. Bookings and
 * technicians sit at their real coordinates on a light grid; areas are
 * labelled where their bookings are, so who is near whom reads correctly.
 */
export function CityMap({ bookings, technicians, onOpen }: { bookings: AdminBooking[]; technicians: Partner[]; onOpen: (id: string) => void }) {
  const [hover, setHover] = useState<{ kind: 'b'; b: AdminBooking } | { kind: 't'; t: Partner } | null>(null)

  const { project, areas } = useMemo(() => {
    const pts: GeoPoint[] = [...bookings.map((b) => b.geo), ...technicians.map((t) => t.geo)]
    const pad = 0.015
    const lat = pts.map((p) => p.lat)
    const lng = pts.map((p) => p.lng)
    const box = { minLat: Math.min(...lat) - pad, maxLat: Math.max(...lat) + pad, minLng: Math.min(...lng) - pad, maxLng: Math.max(...lng) + pad }
    const project = (p: GeoPoint) => ({ x: ((p.lng - box.minLng) / (box.maxLng - box.minLng)) * W, y: (1 - (p.lat - box.minLat) / (box.maxLat - box.minLat)) * H })
    const byArea = new Map<string, GeoPoint[]>()
    bookings.forEach((b) => byArea.set(b.area, [...(byArea.get(b.area) ?? []), b.geo]))
    const areas = [...byArea].map(([name, g]) => ({ name, at: project({ lat: g.reduce((s, p) => s + p.lat, 0) / g.length, lng: g.reduce((s, p) => s + p.lng, 0) / g.length }) }))
    return { project, areas }
  }, [bookings, technicians])

  if (!bookings.length && !technicians.length) return null
  const routes = bookings.flatMap((b) => {
    const t = technicians.find((x) => x.id === b.technicianId)
    return t && b.status !== 'assigned' ? [{ b, a: project(t.geo), z: project(b.geo) }] : []
  })
  const pin = (b: AdminBooking) =>
    b.status === 'confirmed' ? (b.priority === 'emergency' || b.dispatch.noTechFound ? 'var(--color-danger)' : 'var(--color-warning)') : 'var(--color-violet)'
  const hp = hover ? project(hover.kind === 'b' ? hover.b.geo : hover.t.geo) : null

  return (
    <div className="relative overflow-hidden rounded-b-card bg-map-ground">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Map of open bookings and technicians">
        <defs>
          <pattern id="city-grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M50 0H0V50" fill="none" stroke="var(--color-map-grid)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#city-grid)" />
        {areas.map((a) => (
          <g key={a.name}>
            <circle cx={a.at.x} cy={a.at.y} r="48" fill="var(--color-map-zone)" opacity="0.7" />
            <text x={a.at.x} y={a.at.y + 4} textAnchor="middle" className="fill-map-label text-[14px] font-bold uppercase">
              {a.name}
            </text>
          </g>
        ))}
        {routes.map(({ b, a, z }) => (
          <line key={b.id} x1={a.x} y1={a.y} x2={z.x} y2={z.y} stroke="var(--color-violet)" strokeWidth="2.5" strokeDasharray="7 7" className="animate-route" opacity="0.7" />
        ))}
        {technicians.map((t) => {
          const p = project(t.geo)
          return (
            <g key={t.id} onMouseEnter={() => setHover({ kind: 't', t })} onMouseLeave={() => setHover(null)}>
              <circle cx={p.x} cy={p.y} r="16" fill="transparent" />
              <circle cx={p.x} cy={p.y} r="8.5" fill={t.onJob ? 'var(--color-violet)' : 'var(--color-success)'} stroke="var(--color-white)" strokeWidth="3" />
            </g>
          )
        })}
        {bookings.map((b) => {
          const p = project(b.geo)
          const urgent = b.status === 'confirmed' && (b.priority === 'emergency' || b.dispatch.noTechFound)
          return (
            <g
              key={b.id}
              transform={`translate(${p.x} ${p.y})`}
              onMouseEnter={() => setHover({ kind: 'b', b })}
              onMouseLeave={() => setHover(null)}
              onClick={() => onOpen(b.id)}
              className="cursor-pointer"
              role="button"
              aria-label={`${b.displayId}, ${BOOKING_STATUS[b.status].label}`}
            >
              {urgent && (
                <circle r="14" fill="var(--color-danger)" opacity="0.35">
                  <animate attributeName="r" values="12;30" dur="1.6s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.45;0" dur="1.6s" repeatCount="indefinite" />
                </circle>
              )}
              <path d="M0 0 C-11 -14 -12 -20 -12 -24 A12 12 0 1 1 12 -24 C12 -20 11 -14 0 0Z" fill={pin(b)} stroke="var(--color-white)" strokeWidth="2.5" />
              <circle cy="-24" r="4.5" fill="var(--color-white)" />
            </g>
          )
        })}
      </svg>
      {hover && hp && (
        <div
          className="pointer-events-none absolute z-10 w-60 -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-card px-3 py-2.5 text-xs shadow-float"
          style={{ left: `${(hp.x / W) * 100}%`, top: `calc(${(hp.y / H) * 100}% - ${hover.kind === 'b' ? 34 : 14}px)` }}
        >
          {hover.kind === 'b' ? (
            <>
              <p className="flex items-center justify-between gap-2 font-extrabold">
                {hover.b.displayId}
                <span className={cn('font-bold', hover.b.status === 'confirmed' ? 'text-danger' : 'text-muted')}>{BOOKING_STATUS[hover.b.status].label}</span>
              </p>
              <p className="mt-0.5 font-semibold text-ink-2">
                {hover.b.serviceName} · {slot(hover.b.slotStart)}
              </p>
              <p className="truncate text-muted">
                {hover.b.customer.name} · {hover.b.area}
              </p>
            </>
          ) : (
            <>
              <p className="font-extrabold">{hover.t.name}</p>
              <p className="font-semibold text-muted">
                {hover.t.onJob ? 'On a job' : 'Free'} · {hover.t.area} · ★ {hover.t.rating.toFixed(2)}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
