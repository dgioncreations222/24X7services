'use client'

import { rupees } from '@/lib/money'
import { Activity, BriefcaseBusiness, Clock3, IndianRupee, UserRoundCheck } from 'lucide-react'
import { StatCard } from '@/components/ui'
import type { DashboardData } from '@/lib/data'

const change = (now: number, before: number) => (before ? ((now - before) / before) * 100 : 0)

/** Today in five numbers, each a link to the page behind it. */
export function Kpis({ d }: { d: DashboardData }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <StatCard
        label="Bookings today"
        value={d.today.bookings}
        icon={<BriefcaseBusiness />}
        delta={d.yesterday.bookings ? { value: change(d.today.bookings, d.yesterday.bookings), label: 'vs yesterday' } : undefined}
        href="/bookings"
      />
      <StatCard
        label="Revenue today"
        value={rupees(d.today.revenue)}
        icon={<IndianRupee />}
        toneName="success"
        hint={`${d.today.completed} completed`}
        delta={d.yesterday.revenue ? { value: change(d.today.revenue, d.yesterday.revenue), label: 'vs yesterday' } : undefined}
      />
      <StatCard label="Live jobs" value={d.live} icon={<Activity />} toneName="violet" hint="Assigned or under way" href="/dispatch" />
      <StatCard
        label="Waiting to assign"
        value={d.unassigned}
        icon={<Clock3 />}
        toneName={d.urgent ? 'danger' : 'warning'}
        hint={d.urgent ? <span className="font-bold text-danger">{d.urgent} urgent</span> : 'None urgent'}
        href="/dispatch"
      />
      <StatCard
        label="Technicians online"
        value={
          <>
            {d.techs.online}
            <span className="text-base text-faint">/{d.techs.active}</span>
          </>
        }
        icon={<UserRoundCheck />}
        toneName="info"
        hint={`${d.techs.onJob} on a job`}
        href="/technicians"
      />
    </div>
  )
}
