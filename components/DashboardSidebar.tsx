'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

const NAV = [
  { label: 'Início',       href: '/dashboard',             icon: '🏠' },
  { label: 'Clientes',     href: '/dashboard/clientes',     icon: '👥' },
  { label: 'Cobranças',    href: '/dashboard/cobrancas',    icon: '💲' },
  { label: 'Notas Fiscais', href: '/dashboard/notas',       icon: '🧾' },
  { label: 'Contas a pagar', href: '/dashboard/contas-a-pagar', icon: '📉' },
]

export default function DashboardSidebar({
  businessName,
  userName,
  logoUrl,
  brandColor,
  children,
}: {
  businessName: string
  userName: string
  logoUrl?: string | null
  brandColor?: string | null
  children?: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-screen bg-slate-50" style={{ '--brand-primary': brandColor || '#2563eb' } as React.CSSProperties}>
      <aside className="w-60 hidden md:flex flex-col fixed top-0 left-0 h-full bg-slate-900 z-20">
        <div className="px-4 py-5 border-b border-white/10">
          {logoUrl ? (
            <img src={logoUrl} alt={businessName} className="h-8 max-w-full object-contain" />
          ) : (
            <img src="/brand/logo-horizontal-white.png" alt="FATUR4U" className="h-6 w-auto" />
          )}
        </div>

        <div className="px-4 py-4 border-b border-white/10">
          <p className="text-white text-sm font-semibold truncate">{userName}</p>
          <p className="text-slate-400 text-xs truncate">{businessName}</p>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {NAV.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition text-sm font-semibold ${
                  active ? 'bg-white/15 text-white' : 'text-slate-300 hover:bg-white/10'
                }`}>
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}

          <div className="pt-2 border-t border-white/10 mt-2">
            <Link href="/dashboard/configuracoes"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition text-sm font-semibold ${
                pathname === '/dashboard/configuracoes' ? 'bg-white/15 text-white' : 'text-slate-300 hover:bg-white/10'
              }`}>
              <span className="text-base">⚙️</span>
              Configurações
            </Link>
          </div>
        </nav>

        <div className="px-3 pb-4">
          <form action="/auth/logout" method="post">
            <button className="w-full text-slate-400 text-sm py-2 hover:bg-white/10 rounded-lg transition">
              Sair
            </button>
          </form>
        </div>
      </aside>

      <div className="md:ml-60 flex-1 min-h-screen">
        {children}
      </div>
    </div>
  )
}
