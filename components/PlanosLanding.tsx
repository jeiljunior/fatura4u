import Link from 'next/link'
import { lerPlanos } from '@/lib/planos'
import { PADRAO, PLANO_DESTAQUE, precoAnual, type ConfigPlanos, type PlanoId } from '@/lib/planosBase'

const REAIS = (cents: number) => (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
const ORDEM: PlanoId[] = ['gratis', 'essencial', 'profissional', 'personalizado']

// Seção "Planos" da página inicial. Tudo vem do painel de gestão (Planos e
// valores). Se a leitura falhar, cai nos textos padrão — a página inicial
// nunca pode quebrar por causa disso.
export default async function PlanosLanding() {
  let config: ConfigPlanos
  try {
    config = await lerPlanos()
  } catch {
    config = PADRAO
  }
  return <PlanosLandingView config={config} />
}

export function PlanosLandingView({ config }: { config: ConfigPlanos }) {
  const finais = config.landing_precos === 'finais'

  return (
    <section id="planos" className="relative overflow-hidden py-24 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      <div className="relative max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <p className="text-cyan-400 text-xs font-bold tracking-widest uppercase mb-3">Planos</p>
          <h2 className="text-3xl md:text-4xl font-black text-white">Escolha o plano do seu negócio</h2>
          {!finais && <p className="text-slate-400 mt-3">Valores em definição. Em breve divulgaremos os preços.</p>}
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {ORDEM.map(id => {
            const p = config.planos[id]
            const destaque = id === PLANO_DESTAQUE
            const anual = finais ? precoAnual(p.preco_cents, config.desconto_anual_pct) : null
            const pago = id === 'essencial' || id === 'profissional'

            let preco: React.ReactNode
            if (id === 'personalizado') preco = <span className="text-2xl font-black">Sob consulta</span>
            else if (id === 'gratis') preco = <span className="text-3xl font-black">R$ 0</span>
            else if (finais && p.preco_cents != null) preco = <><span className="text-3xl font-black">R$ {REAIS(p.preco_cents)}</span><span className="text-slate-400 text-sm"> /mês</span></>
            else preco = <span className="text-lg font-bold text-slate-300">Valor em definição</span>

            const limites = finais && id !== 'personalizado'
              ? [p.notas_mes != null ? `${p.notas_mes} notas por mês` : 'Notas ilimitadas', p.usuarios != null ? `Até ${p.usuarios} usuários` : 'Usuários ilimitados']
              : []

            return (
              <div key={id} className={`relative rounded-2xl p-6 flex flex-col border ${destaque ? 'border-blue-400 bg-white/10' : 'border-white/10 bg-white/5'}`}>
                {destaque && <span className="absolute -top-3 left-6 bg-blue-500 text-white text-[11px] font-bold tracking-wide px-3 py-1 rounded-full">MAIS ESCOLHIDO</span>}
                <p className="text-xs font-bold tracking-widest text-slate-300 uppercase">{p.nome}</p>
                <p className="text-sm text-slate-400 mt-1">{p.subtitulo}</p>
                <div className="mt-4 text-white">{preco}</div>
                {anual && <p className="text-xs text-slate-400 mt-1">ou R$ {REAIS(anual.total)} por ano (R$ {REAIS(anual.porMes)} por mês)</p>}

                {limites.length > 0 && (
                  <ul className="mt-4 space-y-1 text-sm text-slate-200">
                    {limites.map(l => <li key={l}>{l}</li>)}
                  </ul>
                )}

                <ul className="mt-4 space-y-2 text-sm text-slate-300 flex-1">
                  {p.recursos.map((rec, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-cyan-400">✓</span>
                      <span>
                        {rec.texto}
                        {rec.em_breve && <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-300">em breve</span>}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6">
                  {id === 'gratis' ? (
                    <Link href="/cadastro" className="block text-center bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-5 py-3 rounded-xl transition">Começar grátis</Link>
                  ) : pago && config.contratacao_aberta ? (
                    <Link href="/cadastro" className="block text-center bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-5 py-3 rounded-xl transition">Contratar</Link>
                  ) : (
                    <span className="block text-center bg-white/10 text-slate-400 text-sm font-bold px-5 py-3 rounded-xl cursor-not-allowed">Em breve</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-center text-xs text-slate-500 mt-8">
          {finais ? 'Valores finais, com impostos incluídos.' : 'Valores em definição.'}
        </p>
      </div>
    </section>
  )
}
