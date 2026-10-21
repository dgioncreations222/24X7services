'use client'

import type { Route } from 'next'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { Activity, Clock3, UserRoundCheck, UserRoundX } from 'lucide-react'
import { BookingDrawer } from '@/components/bookings/BookingDrawer'
import { AssignModal } from '@/components/dispatch/AssignModal'
import { CityMap } from '@/components/dispatch/CityMap'
import { Queue } from '@/components/dispatch/Queue'
import { Async, Card, CardHeader, Page, PageHeader, SkeletonRows, StatCard } from '@/components/ui'
import { LIVE_STATUSES, useBookings, usePartners, type AdminBooking } from '@/lib/data'

export default function DispatchPage() {
  return (
    <Suspense>
      <Dispatch />
    </Suspense>
  )
}

/**
 * Live dispatch: jobs nobody would take, jobs waiting for a technician, and
 * jobs under way — with the city map beside them.
 */
function Dispatch() {
  const router = useRouter()
  const params = useSearchParams()
  const bookings = useBookings()
  const partners = usePartners()
  const [assign, setAssign] = useState<AdminBooking | null>(null)
  const open = (id: string | null) => router.replace((id ? `/dispatch?id=${id}` : '/dispatch') as Route, { scroll: false })

  return (
    <Page>
      <PageHeader title="Live dispatch" sub="Assign waiting jobs by hand, starting with the ones nobody took." />
      <Async query={bookings} loading={<SkeletonRows rows={6} />}>
        {(all) => (
          <Async query={partners} loading={<SkeletonRows rows={6} />}>
            {(people) => {
              const byUrgency = (a: AdminBooking, b: AdminBooking) =>
                Number(b.priority === 'emergency') - Number(a.priority === 'emergency') || a.slotStart - b.slotStart
              const unassigned = all.filter((b) => b.status === 'confirmed')
              const noTech = unassigned.filter((b) => b.dispatch.noTechFound).sort(byUrgency)
              const waiting = unassigned.filter((b) => !b.dispatch.noTechFound).sort(byUrgency)
              const live = all.filter((b) => LIVE_STATUSES.includes(b.status)).sort((a, b) => a.slotStart - b.slotStart)
              const online = people.filter((p) => p.status === 'active' && p.online)
              return (
                <>
                  <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <StatCard label="No technician found" value={noTech.length} icon={<UserRoundX />} toneName="danger" hint="Offered, nobody took it" />
                    <StatCard label="Waiting to assign" value={waiting.length} icon={<Clock3 />} toneName="warning" hint={`${waiting.filter((b) => b.priority === 'emergency').length} emergency`} />
                    <StatCard label="Live jobs" value={live.length} icon={<Activity />} toneName="violet" hint="Assigned or under way" />
                    <StatCard label="Technicians free" value={online.filter((p) => !p.onJob).length} icon={<UserRoundCheck />} toneName="success" hint={`${online.length} online`} />
                  </div>
                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
                    <div className="space-y-5">
                      <Card className="overflow-hidden border-danger/30">
                        <CardHeader title="No technician found" sub="Every technician offered the job said no or let it time out. Assign one by hand." />
                        <Queue rows={noTech} partners={people} onOpen={open} onAssign={setAssign} empty="Nothing stuck — every job found someone." />
                      </Card>
                      <Card className="overflow-hidden">
                        <CardHeader title="Waiting to assign" sub="Emergencies first, then by slot." />
                        <Queue rows={waiting} partners={people} onOpen={open} onAssign={setAssign} empty="Nothing waiting." />
                      </Card>
                      <Card className="overflow-hidden">
                        <CardHeader title="Live jobs" sub="Assigned, on the way, or being worked on." />
                        <Queue rows={live} partners={people} onOpen={open} empty="No jobs under way right now." />
                      </Card>
                    </div>
                    <Card className="h-fit overflow-hidden xl:sticky xl:top-20">
                      <CardHeader title="Map" sub="Red: needs a technician now · amber: waiting · violet: under way · dots: technicians online" />
                      <CityMap bookings={[...noTech, ...waiting, ...live]} technicians={online} onOpen={open} />
                    </Card>
                  </div>
                </>
              )
            }}
          </Async>
        )}
      </Async>
      {assign && <AssignModal booking={assign} onClose={() => setAssign(null)} />}
      <BookingDrawer id={params.get('id')} onClose={() => open(null)} />
    </Page>
  )
}
