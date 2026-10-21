'use client'

export function Empty({ icon, title, body }: { icon: React.ReactNode; title: string; body?: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-3 grid size-12 place-items-center rounded-full bg-canvas text-muted [&_svg]:size-5">{icon}</div>
      <p className="font-bold">{title}</p>
      {body && <p className="mt-1 max-w-xs text-sm text-muted">{body}</p>}
    </div>
  )
}

/** A label/value pair inside a drawer. */
export function Detail({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-faint">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-ink">{children}</dd>
    </div>
  )
}

export function SectionLabel({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-2.5 mt-6 flex items-center justify-between first:mt-0">
      <h3 className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-faint">{children}</h3>
      {action}
    </div>
  )
}
