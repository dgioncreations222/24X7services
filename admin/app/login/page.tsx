'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { BRAND } from '@/lib/brand'
import { Button, Field, inputClass } from '@/components/ui'
import { ADMIN, useStore } from '@/lib/store'

/**
 * Staff sign-in. The demo has no identity backend, so the form is prefilled
 * and any password signs in — the console's real gate belongs to whichever
 * auth provider the network adopts.
 */
export default function Login() {
  const store = useStore()
  const router = useRouter()
  const [email, setEmail] = useState(ADMIN.email)
  const [password, setPassword] = useState('demo-admin')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setTimeout(() => {
      store.signIn()
      router.replace('/dashboard')
    }, 500)
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-brand-ink p-12 text-white lg:flex lg:flex-col">
        <Logo inverted />
        <div className="my-auto max-w-md">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/50">Operations console</p>
          <h1 className="mt-4 text-4xl font-extrabold leading-[1.1] tracking-tight">One desk for every booking, technician and rupee.</h1>
          <p className="mt-4 text-base font-medium leading-relaxed text-white/65">
            Dispatch emergencies, approve technicians, settle payouts and answer customers — across Samsung, LG, Bosch and IFB service in Hyderabad.
          </p>
          <dl className="mt-10 grid grid-cols-3 gap-6 border-t border-white/10 pt-6">
            {[
              ['Live', 'Emergency desk'],
              ['20', 'Service areas'],
              ['5', 'Appliance lines'],
            ].map(([v, l]) => (
              <div key={l}>
                <dt className="num text-2xl font-extrabold">{v}</dt>
                <dd className="mt-1 text-xs font-semibold text-white/55">{l}</dd>
              </div>
            ))}
          </dl>
        </div>
        <p className="text-xs font-medium text-white/40">Authorised staff only. Every action is logged.</p>
        <div aria-hidden className="pointer-events-none absolute -right-32 -top-32 size-96 rounded-full border border-white/5" />
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full border border-white/5" />
      </section>

      <section className="flex items-center justify-center bg-canvas px-4 py-12 sm:px-8">
        <form onSubmit={submit} className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">Sign in</h2>
          <p className="mt-1 text-sm font-medium text-muted">Use your {BRAND.name} staff account.</p>
          <div className="mt-8 space-y-4">
            <Field label="Work email">
              <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={`${inputClass} h-11`} />
            </Field>
            <Field label="Password">
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  required
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
          </div>
          <Button type="submit" disabled={busy} className="mt-6 h-11 w-full">
            <LockKeyhole /> {busy ? 'Signing in…' : 'Sign in to console'}
          </Button>
          <p className="mt-6 flex items-start gap-2 rounded-lg border border-line bg-card p-3 text-xs font-medium leading-relaxed text-muted">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
            Demo console — the account is prefilled and the data is a seeded month of the Hyderabad network, saved on this device.
          </p>
        </form>
      </section>
    </div>
  )
}
