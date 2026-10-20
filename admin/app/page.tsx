'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAdminSession } from '@/lib/data'

/** The front door: the dashboard if signed in, otherwise sign-in. */
export default function Index() {
  const session = useAdminSession()
  const router = useRouter()
  useEffect(() => {
    if (session.status !== 'loading') router.replace(session.status === 'signed_in' ? '/dashboard' : '/login')
  }, [session.status, router])
  return <div className="min-h-dvh bg-brand-ink" />
}
