'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ABAS = [
  { label: 'Visão geral', href: '/admin' },
  { label: 'Negócios', href: '/admin/negocios' },
  { label: 'Registro de ações', href: '/admin/auditoria' },
]

export default function AbasPainel() {
  const pathname = usePathname()
  return (
    <nav className="flex flex-wrap gap-2">
      {ABAS.map(aba => {
        const ativa = aba.href === '/admin' ? pathname === '/admin' : pathname.startsWith(aba.href)
        return (
          <Link key={aba.href} href={aba.href}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              ativa ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}>
            {aba.label}
          </Link>
        )
      })}
    </nav>
  )
}
