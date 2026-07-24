'use client'
import { useState, ReactNode } from 'react'

export default function CollapsibleSection({
  title, subtitle, defaultOpen = false, children,
}: {
  title: string
  subtitle?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left">
        <div>
          <h2 className="font-bold text-slate-900">{title}</h2>
          {subtitle && <p className="text-slate-400 text-sm mt-0.5">{subtitle}</p>}
        </div>
        <span className="shrink-0 text-sm font-semibold text-[var(--brand-primary)]">
          {open ? 'Fechar ▴' : 'Configurar ▾'}
        </span>
      </button>
      {open && <div className="px-6 pb-6 pt-2 border-t border-slate-100">{children}</div>}
    </section>
  )
}
