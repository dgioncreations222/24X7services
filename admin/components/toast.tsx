'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'

/** A one-line receipt for every action, bottom-right, gone in a few seconds. */
const ToastCtx = createContext<(text: string) => void>(() => {})

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<{ id: number; text: string }[]>([])
  const seq = useRef(0)
  const push = useCallback((text: string) => {
    const id = ++seq.current
    setItems((s) => [...s.slice(-2), { id, text }])
    setTimeout(() => setItems((s) => s.filter((x) => x.id !== id)), 3600)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
        {items.map((t) => (
          <div key={t.id} className="animate-slide-up flex items-center gap-2.5 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white shadow-float">
            <CheckCircle2 className="size-4 shrink-0 text-live-bright" aria-hidden />
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)
