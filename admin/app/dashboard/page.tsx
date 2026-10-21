'use client'

import { Kpis } from '@/components/dashboard/Kpis'
import { BookingsChart, NeedsAttention, RevenueByCategory, TopTechnicians, Upcoming } from '@/components/dashboard/Panels'
import { Async, Page, PageHeader } from '@/components/ui'
import { useAdminSession, useDashboard } from '@/lib/data'

const greeting = (h: number) => (h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening')

/** The network right now: today's numbers, what needs a person, and how the month is going. */
export default function Dashboard() {
  const session = useAdminSession()
  const dashboard = useDashboard()
  // The greeting and date come from the browser's clock, so they wait for the
  // session (which is 'loading' in the static HTML) to avoid a hydration mismatch.
  const signedIn = session.status === 'signed_in'
  return (
    <Page>
      <PageHeader
        title={signedIn ? `${greeting(new Date().getHours())}, ${session.admin.name.split(' ')[0]}` : 'Dashboard'}
        sub={signedIn ? new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }) : undefined}
      />
      <Async query={dashboard} loading={<Skeleton />}>
        {(d) => (
          <div className="space-y-5">
            <Kpis d={d} />
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <BookingsChart d={d} />
              <NeedsAttention d={d} />
            </div>
            <div className="grid gap-5 lg:grid-cols-3">
              <RevenueByCategory d={d} />
              <TopTechnicians d={d} />
              <Upcoming d={d} />
            </div>
          </div>
        )}
      </Async>
    </Page>
  )
}

/** The page's shape in grey while the numbers load. */
function Skeleton() {
  const box = 'animate-pulse rounded-card border border-line bg-card'
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className={`${box} h-32`} />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <div className={`${box} h-80`} />
        <div className={`${box} h-80`} />
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className={`${box} h-72`} />
        ))}
      </div>
    </div>
  )
}
