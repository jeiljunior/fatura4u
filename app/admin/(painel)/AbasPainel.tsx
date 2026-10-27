'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ABAS = [
  { label: 'Visão geral', href: '/admin' },
  { label: 'Empresas', href: '/admin/empresas' },
  { label: 'Recebimentos', href: '/admin/recebimentos' },
  { label: 'E-mails', href: '/admin/emails' },
  { label: 'Mapa de telas', href: '/admin/telas' },
  { label: 'Registro de ações', href: '/admin/auditoria' },
]

export default function AbasPainel() {
  const pathname = usePathname()
  return (
    <nav className="mb-6 flex flex-wrap gap-2">
      {ABAS.map(aba => {
        // O cadastro de empresa nova também pertence à aba Empresas.
        const ativa = aba.href === '/admin'
          ? pathname === '/admin'
          : pathname.startsWith(aba.href) || (aba.href === '/admin/empresas' && pathname.startsWith('/admin/novo'))
        return (
          <Link key={aba.href} href={aba.href}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              ativa ? 'border-blue-700 bg-blue-700 text-white' : 'border-zinc-200 bg-transparent text-zinc-500 hover:bg-zinc-100'
            }`}>
            {aba.label}
          </Link>
        )
      })}
    </nav>
  )
}
