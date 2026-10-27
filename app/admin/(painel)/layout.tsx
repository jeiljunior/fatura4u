import Link from 'next/link'
import { requirePlatformAdminMfa } from '@/lib/platformAdmin'
import AbasPainel from './AbasPainel'

export const dynamic = 'force-dynamic'

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requirePlatformAdminMfa()

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between bg-slate-950 px-6 py-3">
        <div className="flex items-center gap-3">
          <img src="/brand/logo-horizontal-white.png" alt="FATUR4U" style={{ height: 26, width: 'auto' }} />
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold tracking-wide text-slate-100">PAINEL DE GESTÃO</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="hidden text-slate-300 sm:inline">{user.email}</span>
          <Link href="/dashboard" className="rounded-full border border-slate-600 px-4 py-1.5 text-slate-100 hover:bg-slate-800">
            ← Voltar ao app
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-6">
        <AbasPainel />
        <div className="mt-6">{children}</div>
      </div>
    </div>
  )
}
