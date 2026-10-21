import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_SETTINGS, TECHNICIAN, lateRequest, seedJobs, seedNotices } from './seed'
import { LABOUR_RATE, applianceTitle, inr } from './catalog'
import { billTotal } from './format'
import type { AiThread, CallRecord } from './ai/types'
import { kv } from './storage'
import type { Bill, Confirmation, Diagnosis, FlowStep, Job, Notice, NotificationKind, PartLine, Photo, Settings, Technician } from './types'

/**
 * The whole app's state, kept on the device.
 *
 * There is no dispatch backend yet, so this is the backend: jobs move through
 * their flow here and the result is written to the device's key-value store
 * (lib/storage), which is what lets a technician close the app mid-job and
 * come back to the same step. Every read and write is guarded, so a storage
 * failure leaves the app running from the seed instead.
 */

// v2: the demo now starts signed in. A v1 save from when it started signed
// out would otherwise drop everyone on the login screen.
// v3: the 'ibm' brand became 'ifb'; older saves hold jobs keyed to the old id.
const KEY = 'technician.state.v3'

interface Persisted {
  signedIn: boolean
  online: boolean
  jobs: Job[]
  notices: Notice[]
  tech: Technician
  settings: Settings
  lateDelivered: boolean
  seededOn: string
  /** AI assistant conversations and calls, each tied to a job when it has one. */
  aiThreads: AiThread[]
  aiCalls: CallRecord[]
}

function fresh(): Persisted {
  return {
    // Opens straight on Home; Logout (Settings, Profile) shows the login screen.
    signedIn: true,
    online: true,
    jobs: seedJobs(),
    notices: seedNotices(),
    tech: TECHNICIAN,
    settings: DEFAULT_SETTINGS,
    lateDelivered: false,
    seededOn: new Date().toDateString(),
    aiThreads: [],
    aiCalls: [],
  }
}

function load(): Persisted {
  try {
    const raw = kv.getItem(KEY)
    if (raw) {
      const saved = JSON.parse(raw) as Persisted
      // The demo day is rebuilt each morning so "today" never goes stale,
      // but who is signed in and how they set the app up carries over.
      // Every launch opens signed in, so the app never strands anyone on the
      // login screen; Logout still ends the session until the next reload.
      // Settings added since the save was written fall back to their defaults.
      const settings = { ...DEFAULT_SETTINGS, ...saved.settings }
      const tech = { ...TECHNICIAN, ...saved.tech }
      if (saved.seededOn === new Date().toDateString())
        return { ...saved, settings, tech, signedIn: true, aiThreads: saved.aiThreads ?? [], aiCalls: saved.aiCalls ?? [] }
      return { ...fresh(), tech, settings }
    }
  } catch {
    /* storage unavailable — run from the seed */
  }
  return fresh()
}

let noticeSeq = 100

/** Which Settings → Notifications switch lets each kind of notice through. */
const NOTICE_SWITCH: Partial<Record<NotificationKind, keyof Settings['notify']>> = {
  request: 'requests',
  emergency: 'emergency',
  schedule: 'schedule',
  cancelled: 'schedule',
  payment: 'payments',
  rating: 'payments',
  accepted: 'schedule',
  ai_call: 'schedule',
}

const allowed = (s: Settings, kind: NotificationKind) => {
  const key = NOTICE_SWITCH[kind]
  return !key || s.notify[key]
}

interface Store extends Persisted {
  ready: boolean
  signIn: () => void
  signOut: () => void
  setOnline: (v: boolean) => void
  accept: (id: string) => void
  reject: (id: string) => void
  advance: (id: string, to: FlowStep) => void
  saveDiagnosis: (id: string, d: Diagnosis) => void
  setParts: (id: string, parts: PartLine[]) => void
  addPhoto: (id: string, photo: Photo) => void
  removePhoto: (id: string, photoId: string) => void
  saveBill: (id: string, bill: Bill) => void
  confirm: (id: string, c: Confirmation) => void
  markRead: (noticeId: string) => void
  markAllRead: () => void
  saveThread: (thread: AiThread) => void
  saveCall: (call: CallRecord) => void
  /** Remove AI conversations and call summaries by id. */
  deleteAi: (ids: { threads?: string[]; calls?: string[] }) => void
  saveServiceNotes: (jobId: string, notes: { diagnosis: string; action: string; recommendation: string }) => void
  updateTech: (patch: Partial<Technician>) => void
  /** A patch, or a function of the latest settings when it builds on them. */
  updateSettings: (patch: Partial<Settings> | ((s: Settings) => Partial<Settings>)) => void
  resetDemo: () => void
}

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Persisted>(fresh)
  const [ready, setReady] = useState(false)
  const loaded = useRef(false)

  useEffect(() => {
    // Read storage after mount, so a first launch shows the splash rather than
    // a flash of seed data that is then swapped out.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(load())
    loaded.current = true
    setReady(true)
  }, [])

  useEffect(() => {
    if (!loaded.current) return
    try {
      kv.setItem(KEY, JSON.stringify(state))
    } catch {
      /* photos can overflow the quota; the session still works */
    }
  }, [state])

  // A new request lands shortly after the technician is online, so the
  // incoming-request takeover is something the demo actually shows.
  useEffect(() => {
    if (!ready || !state.signedIn || !state.online || state.lateDelivered) return
    const t = setTimeout(() => {
      setState((s) => {
        if (s.lateDelivered) return s
        const job = lateRequest()
        return {
          ...s,
          lateDelivered: true,
          jobs: [job, ...s.jobs],
          notices: !allowed(s.settings, 'request') ? s.notices : [
            {
              id: `n${noticeSeq++}`,
              kind: 'request',
              title: `New service request · ${job.distanceKm} km`,
              body: `${applianceTitle(job.brand, job.appliance)} — ${job.issue}. ${job.customer.area}.`,
              at: new Date().toISOString(),
              read: false,
              jobId: job.id,
            },
            ...s.notices,
          ],
        }
      })
    }, 45_000)
    return () => clearTimeout(t)
  }, [ready, state.signedIn, state.online, state.lateDelivered])

  const patchJob = useCallback((id: string, fn: (j: Job) => Job) => {
    setState((s) => ({ ...s, jobs: s.jobs.map((j) => (j.id === id ? fn(j) : j)) }))
  }, [])

  const notify = useCallback((n: Omit<Notice, 'id' | 'at' | 'read'>) => {
    setState((s) =>
      allowed(s.settings, n.kind)
        ? { ...s, notices: [{ ...n, id: `n${noticeSeq++}`, at: new Date().toISOString(), read: false }, ...s.notices] }
        : s
    )
  }, [])

  const value = useMemo<Store>(() => {
    const now = () => new Date().toISOString()
    return {
      ...state,
      // Dispatch only offers requests inside the service radius set in
      // Settings; widening it brings the farther ones back.
      jobs: state.jobs.filter((j) => j.status !== 'request' || j.distanceKm <= state.settings.radiusKm),
      ready,
      signIn: () => setState((s) => ({ ...s, signedIn: true })),
      signOut: () => setState((s) => ({ ...s, signedIn: false })),
      setOnline: (v) => setState((s) => ({ ...s, online: v })),
      accept: (id) => {
        patchJob(id, (j) => ({
          ...j,
          status: 'accepted',
          log: { ...j.log, assigned: j.log.assigned ?? now(), accepted: now() },
        }))
        const job = state.jobs.find((j) => j.id === id)
        if (job) {
          notify({
            kind: 'accepted',
            title: `Job accepted · ${job.id}`,
            body: `${applianceTitle(job.brand, job.appliance)} for ${job.customer.name}, ${job.customer.area}.`,
            jobId: id,
          })
        }
      },
      reject: (id) => patchJob(id, (j) => ({ ...j, status: 'rejected' })),
      advance: (id, to) => {
        patchJob(id, (j) => {
          const next: Job = { ...j, status: to, log: { ...j.log, [to]: now() } }
          if (to === 'confirmation' && !j.bill) {
            next.bill = { labour: LABOUR_RATE[j.appliance], additional: 0, additionalNote: '', paid: false, method: null }
          }
          return next
        })
        if (to === 'closed') {
          const job = state.jobs.find((j) => j.id === id)
          if (job?.bill?.paid) {
            notify({
              kind: 'payment',
              title: `Payment ${job.bill.method === 'cash' ? 'collected' : 'received'} · ${inr(billTotal(job))}`,
              body: `${job.id} closed. ${job.bill.method === 'cash' ? 'Cash to be deposited at hub.' : 'UPI settled to your wallet.'}`,
              jobId: id,
            })
          }
        }
      },
      saveDiagnosis: (id, d) => patchJob(id, (j) => ({ ...j, diagnosis: d })),
      setParts: (id, parts) => patchJob(id, (j) => ({ ...j, parts })),
      addPhoto: (id, photo) => patchJob(id, (j) => ({ ...j, photos: [...j.photos, photo] })),
      removePhoto: (id, photoId) => patchJob(id, (j) => ({ ...j, photos: j.photos.filter((p) => p.id !== photoId) })),
      saveBill: (id, bill) => patchJob(id, (j) => ({ ...j, bill })),
      confirm: (id, c) => {
        patchJob(id, (j) => ({ ...j, confirmation: c }))
        const job = state.jobs.find((j) => j.id === id)
        if (job && c.rating) {
          notify({
            kind: 'rating',
            title: `New ${c.rating}★ rating`,
            body: `${job.customer.name}${c.review ? `: “${c.review}”` : ' rated your service.'}`,
            jobId: id,
          })
        }
      },
      markRead: (nid) =>
        setState((s) => ({ ...s, notices: s.notices.map((n) => (n.id === nid ? { ...n, read: true } : n)) })),
      markAllRead: () => setState((s) => ({ ...s, notices: s.notices.map((n) => ({ ...n, read: true })) })),
      saveThread: (thread) =>
        setState((s) => ({ ...s, aiThreads: [thread, ...s.aiThreads.filter((t) => t.id !== thread.id)] })),
      saveCall: (call) => {
        const first = !state.aiCalls.some((c) => c.id === call.id)
        setState((s) => ({ ...s, aiCalls: [call, ...s.aiCalls.filter((c) => c.id !== call.id)] }))
        // One notice per call, not one per re-save after an edit.
        if (first) {
          notify({ kind: 'ai_call', title: `AI call summary · ${call.jobId}`, body: call.summary.result, jobId: call.jobId })
        }
      },
      deleteAi: ({ threads = [], calls = [] }) =>
        setState((s) => ({
          ...s,
          aiThreads: s.aiThreads.filter((t) => !threads.includes(t.id)),
          aiCalls: s.aiCalls.filter((c) => !calls.includes(c.id)),
        })),
      saveServiceNotes: (jobId, notes) => patchJob(jobId, (j) => ({ ...j, serviceNotes: { ...notes, savedAt: now() } })),
      updateTech: (patch) => setState((s) => ({ ...s, tech: { ...s.tech, ...patch } })),
      updateSettings: (patch) =>
        setState((s) => ({ ...s, settings: { ...s.settings, ...(typeof patch === 'function' ? patch(s.settings) : patch) } })),
      resetDemo: () => setState({ ...fresh(), signedIn: true }),
    }
  }, [state, ready, patchJob, notify])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const s = useContext(Ctx)
  if (!s) throw new Error('useStore outside StoreProvider')
  return s
}

export function useJob(id: string | null): Job | undefined {
  const { jobs } = useStore()
  return id ? jobs.find((j) => j.id === id) : undefined
}

/** Re-render on a clock, for "min ago" labels and the moving van. */
export function useTick(ms = 15_000): number {
  const [t, setT] = useState(() => Date.now())
  useEffect(() => {
    const i = setInterval(() => setT(Date.now()), ms)
    return () => clearInterval(i)
  }, [ms])
  return t
}
