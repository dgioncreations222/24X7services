'use client'

import type { Route } from 'next'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { AdminsTable } from '@/components/admins/AdminsTable'
import { RoleMatrix } from '@/components/admins/RoleMatrix'
import { Page, PageHeader, Tabs } from '@/components/ui'

export default function AdminsPage() {
  return (
    <Suspense>
      <Admins />
    </Suspense>
  )
}

/** Who can use the console and what each role is allowed to do. */
function Admins() {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const tab = params.get('tab') === 'roles' ? 'roles' : 'admins'
  return (
    <Page>
      <PageHeader title="Admin users" sub="Invite staff, set their role, and decide what each role can see and do." />
      <Tabs
        className="mb-5"
        value={tab}
        onChange={(v) => router.replace(`${pathname}${v === 'roles' ? '?tab=roles' : ''}` as Route, { scroll: false })}
        options={[
          { value: 'admins', label: 'Admins' },
          { value: 'roles', label: 'Roles & permissions' },
        ]}
      />
      {tab === 'admins' ? <AdminsTable /> : <RoleMatrix />}
    </Page>
  )
}
