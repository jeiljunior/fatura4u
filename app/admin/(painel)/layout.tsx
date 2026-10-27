import Link from 'next/link'
import { requirePlatformAdminMfa } from '@/lib/platformAdmin'
import AbasPainel from './AbasPainel'

export const dynamic = 'force-dynamic'

// Mesmas medidas do painel de gestão do SIGN4U: cabeçalho #050d26, conteúdo
// centralizado em 1152px, abas em pílula, fundo #fafafa.
export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requirePlatformAdminMfa()

  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-900">
      <header className="flex items-center justify-between bg-[#050d26] px-8 py-3">
        <div className="flex items-center gap-3">
          <img src="/brand/logo-horizontal-white.png" alt="FATUR4U" style={{ height: 28, width: 'auto' }} />
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.6px] text-white">Painel de gestão</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="hidden text-slate-200 sm:inline">{user.email}</span>
          <Link href="/dashboard" className="rounded-full border border-white/20 px-4 py-1.5 text-slate-200 transition hover:bg-white/10">
            ← Voltar ao app
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-8 py-8">
        <AbasPainel />
        {children}
      </main>
    </div>
  )
}
