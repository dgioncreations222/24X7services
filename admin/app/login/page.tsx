'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { Button, Field, inputClass } from '@/components/ui'
import { BRAND } from '@/lib/brand'
import { signInWithEmail, signInWithGoogle, useAdminSession } from '@/lib/data'

/**
 * Staff sign-in: Google or work email + password, admins only. A partner or
 * customer account is told plainly that the console is not for them.
 */
export default function Login() {
  const router = useRouter()
  const session = useAdminSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState<'email' | 'google' | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (session.status === 'signed_in') router.replace('/dashboard')
  }, [session.status, router])

  async function run(kind: 'email' | 'google', action: () => Promise<unknown>) {
    setBusy(kind)
    setError(null)
    try {
      await action()
    } catch (e) {
      setError(e instanceof Error && e.name === 'AuthError' ? e.message : 'Couldn’t reach the server. Check your connection and try again.')
      setBusy(null)
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-brand-ink p-12 text-white lg:flex lg:flex-col">
        <Logo inverted />
        <div className="my-auto max-w-md">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/50">Operations console</p>
          <h1 className="mt-4 text-4xl font-extrabold leading-[1.1] tracking-tight">One desk for every booking, technician and rupee.</h1>
          <p className="mt-4 text-base font-medium leading-relaxed text-white/65">
            Manage the catalog, approve technicians, dispatch jobs and settle payouts — for the whole {BRAND.name} network.
          </p>
        </div>
        <p className="text-xs font-medium text-white/40">Authorised staff only. Every action is logged.</p>
        <div aria-hidden className="pointer-events-none absolute -right-32 -top-32 size-96 rounded-full border border-white/5" />
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full border border-white/5" />
      </section>

      <section className="flex items-center justify-center bg-canvas px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">Sign in</h2>
          <p className="mt-1 text-sm font-medium text-muted">Use your {BRAND.name} admin account.</p>

          <Button variant="secondary" className="mt-8 h-11 w-full" disabled={busy !== null} onClick={() => void run('google', signInWithGoogle)}>
            <span aria-hidden className="grid size-5 place-items-center rounded-full border border-line-strong text-[11px] font-extrabold text-brand">
              G
            </span>
            {busy === 'google' ? 'Signing in…' : 'Continue with Google'}
          </Button>

          <div className="my-6 flex items-center gap-3 text-xs font-bold text-faint" aria-hidden>
            <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              void run('email', () => signInWithEmail(email, password))
            }}
            className="space-y-4"
          >
            <Field label="Work email">
              <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={`${inputClass} h-11`} />
            </Field>
            <Field label="Password">
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  required
                  minLength={6}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass} h-11 pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  aria-label={show ? 'Hide password' : 'Show password'}
                  className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-muted hover:bg-canvas"
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>
            {error && (
              <p role="alert" className="rounded-lg border border-danger/25 bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy !== null} className="h-11 w-full">
              <LockKeyhole /> {busy === 'email' ? 'Signing in…' : 'Sign in to console'}
            </Button>
          </form>

          <p className="mt-6 flex items-start gap-2 rounded-lg border border-line bg-card p-3 text-xs font-medium leading-relaxed text-muted">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
            <span>
              Demo: <span className="font-bold text-ink-2">aditi.rao@customerservice.example</span> (Super Admin) with any 6+ character password. Google signs in as Aditi.
            </span>
          </p>
        </div>
      </section>
    </div>
  )
}
