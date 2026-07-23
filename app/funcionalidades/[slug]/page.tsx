import Link from 'next/link'
import { notFound } from 'next/navigation'
import HeroParticles from '@/components/HeroParticles'
import { FUNCIONALIDADES, getFuncionalidade } from '@/lib/funcionalidades'

export function generateStaticParams() {
  return FUNCIONALIDADES.map(f => ({ slug: f.slug }))
}

export default async function FuncionalidadePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const f = getFuncionalidade(slug)
  if (!f) notFound()

  const outras = FUNCIONALIDADES.filter(x => x.slug !== slug)

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans">

      {/* ── NAVBAR ───────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="select-none">
            <img src="/brand/logo-horizontal-white.png" alt="FATUR4U" className="w-[104px] max-w-full h-auto" />
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-slate-400 font-medium">
            <Link href="/#funcionalidades" className="hover:text-white transition">Funcionalidades</Link>
            <Link href="/#como-funciona" className="hover:text-white transition">Como funciona</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-slate-400 hover:text-white font-medium transition">
              Entrar
            </Link>
            <Link href="/cadastro"
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition shadow-sm">
              Criar conta
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO DA FUNCIONALIDADE ──────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
        <HeroParticles />
        <div className="relative max-w-3xl mx-auto px-6 py-24 text-center">
          <Link href="/#funcionalidades" className="text-blue-400 hover:text-blue-300 text-sm font-medium transition">
            ← Todas as funcionalidades
          </Link>
          <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center text-3xl mx-auto mt-8 mb-6">
            {f.icon}
          </div>
          <h1 className="text-4xl md:text-5xl font-black leading-tight mb-6">{f.title}</h1>
          <p className="text-slate-300 text-lg leading-relaxed">{f.longDesc}</p>
          <div className="mt-10">
            <Link href="/cadastro"
              className="inline-block bg-blue-500 hover:bg-blue-400 text-white font-black text-lg px-10 py-4 rounded-2xl transition shadow-xl shadow-blue-900/50">
              Criar conta grátis
            </Link>
          </div>
        </div>
      </section>

      {/* ── DETALHES ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-20 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
        <HeroParticles />
        <div className="relative z-10 max-w-3xl mx-auto px-6">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8">
            <h2 className="font-bold text-white text-lg mb-5">Como funciona na prática</h2>
            <ul className="space-y-3.5">
              {f.bullets.map(b => (
                <li key={b} className="flex gap-3 text-slate-300 text-sm leading-relaxed">
                  <span className="text-blue-400 shrink-0">✓</span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── OUTRAS FUNCIONALIDADES ──────────────────────────────── */}
      <section className="relative overflow-hidden py-20 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-black text-white mb-8 text-center">Outras funcionalidades</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {outras.map(o => (
              <Link key={o.slug} href={`/funcionalidades/${o.slug}`}
                className="bg-slate-800 rounded-2xl p-5 border border-slate-700 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-900/20 transition group">
                <div className="w-10 h-10 bg-blue-600/20 group-hover:bg-blue-600/30 rounded-xl flex items-center justify-center text-xl mb-3 transition">
                  {o.icon}
                </div>
                <h3 className="font-bold text-white text-sm">{o.title}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-blue-700 to-blue-900 py-20 text-center text-white">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-4xl font-black mb-4">Pronto pra começar?</h2>
          <p className="text-blue-100 text-lg mb-8">Crie sua conta agora, é grátis pra testar.</p>
          <Link href="/cadastro"
            className="inline-block bg-white text-blue-700 font-black text-lg px-10 py-4 rounded-2xl hover:bg-blue-50 transition shadow-xl">
            Criar conta grátis →
          </Link>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer className="bg-slate-950 text-slate-400 py-10 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <img src="/brand/logo-horizontal-white.png" alt="FATUR4U" className="w-[86px] max-w-full h-auto" />
          <p className="text-sm">© {new Date().getFullYear()} FATUR4U. Todos os direitos reservados.</p>
          <Link href="/login" className="text-sm text-blue-400 hover:text-blue-300 transition font-medium">
            Acessar painel →
          </Link>
        </div>
      </footer>

    </div>
  )
}
