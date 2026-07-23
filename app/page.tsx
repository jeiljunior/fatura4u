import Link from 'next/link'
import HeroParticles from '@/components/HeroParticles'
import { FUNCIONALIDADES } from '@/lib/funcionalidades'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans">

      {/* ── NAVBAR ───────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="#" className="select-none">
            <img src="/brand/logo-horizontal-white.png" alt="FATUR4U" className="w-[104px] max-w-full h-auto" />
          </a>
          <nav className="hidden md:flex items-center gap-8 text-sm text-slate-400 font-medium">
            <a href="#funcionalidades" className="hover:text-white transition">Funcionalidades</a>
            <a href="#cobranca-automatica" className="hover:text-white transition">Cobrança automática</a>
            <a href="#como-funciona"   className="hover:text-white transition">Como funciona</a>
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

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
        <HeroParticles />
        <div className="relative max-w-5xl mx-auto px-6 py-28 text-center">
          <span className="inline-block bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold px-4 py-1.5 rounded-full mb-8 tracking-wide uppercase">
            Cobrança e nota fiscal automatizadas
          </span>
          <h1 className="text-5xl md:text-6xl font-black leading-tight mb-6">
            Cobre, receba e fature —<br />
            <span className="text-blue-400">no automático.</span>
          </h1>
          <p className="text-slate-300 text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            O FATUR4U cobra por Pix, boleto, cartão ou link de pagamento, gera cobranças recorrentes
            sozinho, avisa seu cliente antes de vencer — e ainda emite a nota fiscal. Tudo em um painel só.
          </p>
          <div className="flex flex-col items-center gap-3">
            <Link href="/cadastro"
              className="inline-block bg-blue-500 hover:bg-blue-400 text-white font-black text-lg px-10 py-4 rounded-2xl transition shadow-xl shadow-blue-900/50">
              Criar conta
            </Link>
            <p className="text-slate-400 text-sm">Comece grátis, sem cartão de crédito</p>
          </div>
          <div className="flex flex-wrap justify-center gap-10 mt-16 pt-10 border-t border-white/10">
            {[
              { v: 'NFS-e', l: 'Nacional' },
              { v: 'Pix, boleto', l: 'e cartão' },
              { v: 'Recorrente', l: 'automática' },
              { v: 'Zero', l: 'esquecimento' },
            ].map(s => (
              <div key={s.l} className="text-center">
                <p className="text-3xl font-black text-white">{s.v}</p>
                <p className="text-slate-400 text-sm mt-1">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FUNCIONALIDADES ──────────────────────────────────────── */}
      <section id="funcionalidades" className="relative overflow-hidden py-24 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
        <HeroParticles />
        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-white mb-3">Tudo o que você precisa pra faturar</h2>
            <p className="text-slate-400 text-lg">Sem módulo de agenda, sem complicação.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FUNCIONALIDADES.map(f => (
              <Link key={f.slug} href={`/funcionalidades/${f.slug}`}
                className="bg-slate-800 rounded-2xl p-6 border border-slate-700 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-900/20 transition group block">
                <div className="w-12 h-12 bg-blue-600/20 group-hover:bg-blue-600/30 rounded-2xl flex items-center justify-center text-2xl mb-4 transition">
                  {f.icon}
                </div>
                <h3 className="font-bold text-white text-base mb-2">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.shortDesc}</p>
                <span className="inline-block text-blue-400 text-xs font-semibold mt-3 group-hover:text-blue-300">Saiba mais →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── COBRANÇA AUTOMÁTICA (destaque) ──────────────────────── */}
      <section id="cobranca-automatica" className="relative overflow-hidden py-24 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
        <HeroParticles />
        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <div className="text-center mb-4">
            <span className="inline-block bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest mb-4">
              O diferencial do FATUR4U
            </span>
            <h2 className="text-4xl font-black text-white mb-4">Cobrança automática, de verdade.</h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Cadastre uma vez. O sistema cobra, lembra e recebe por você, todo mês.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-14">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 hover:border-blue-500/50 transition">
              <div className="text-4xl mb-4">🔁</div>
              <h3 className="font-bold text-white text-xl mb-3">Cobrança recorrente</h3>
              <ul className="space-y-2.5 text-slate-400 text-sm">
                <li className="flex gap-2"><span className="text-blue-400">✓</span> Cadastre cliente, valor e dia do vencimento uma única vez</li>
                <li className="flex gap-2"><span className="text-blue-400">✓</span> O sistema gera a cobrança real todo mês, sozinho</li>
                <li className="flex gap-2"><span className="text-blue-400">✓</span> Pause, retome ou cancele quando quiser</li>
              </ul>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 hover:border-blue-500/50 transition">
              <div className="text-4xl mb-4">📲</div>
              <h3 className="font-bold text-white text-xl mb-3">Régua de cobrança</h3>
              <ul className="space-y-2.5 text-slate-400 text-sm">
                <li className="flex gap-2"><span className="text-blue-400">✓</span> Lembrete automático por WhatsApp e e-mail</li>
                <li className="flex gap-2"><span className="text-blue-400">✓</span> Antes, no dia e depois do vencimento</li>
                <li className="flex gap-2"><span className="text-blue-400">✓</span> Você nunca mais precisa cobrar na mão</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── COMO FUNCIONA ────────────────────────────────────────── */}
      <section id="como-funciona" className="relative overflow-hidden py-24 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
        <HeroParticles />
        <div className="relative z-10 max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-white mb-3">Como funciona</h2>
            <p className="text-slate-400 text-lg">Comece a faturar em poucos minutos.</p>
          </div>
          <div className="relative">
            <div className="hidden md:block absolute top-10 left-1/6 right-1/6 h-px bg-gradient-to-r from-blue-900 via-blue-500 to-blue-900" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {[
                { n: '1', title: 'Crie sua conta', desc: 'Cadastro gratuito em menos de 1 minuto.' },
                { n: '2', title: 'Configure seus dados', desc: 'Dados fiscais, certificado digital e gateway de pagamento.' },
                { n: '3', title: 'Cobre e fature', desc: 'Cobrança avulsa ou recorrente, régua automática, e a nota sai sozinha.' },
              ].map(s => (
                <div key={s.n} className="text-center relative">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 text-white text-3xl font-black rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-900/50">
                    {s.n}
                  </div>
                  <h3 className="font-bold text-white text-lg mb-2">{s.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-blue-700 to-blue-900 py-20 text-center text-white">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-4xl font-black mb-4">Pronto pra parar de cobrar na mão?</h2>
          <p className="text-blue-100 text-lg mb-8">Crie sua conta agora e deixe a cobrança rodar sozinha.</p>
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
