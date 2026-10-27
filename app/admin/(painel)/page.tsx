import Link from 'next/link'
import { requirePlatformAdminMfa } from '@/lib/platformAdmin'
import { visaoGeral, listaAtencao } from '@/lib/adminData'

export const dynamic = 'force-dynamic'

const REAIS = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

export default async function VisaoGeralPage() {
  await requirePlatformAdminMfa()
  const [dados, atencao] = await Promise.all([visaoGeral(), listaAtencao()])

  const cartoes = [
    { label: 'Negócios', valor: String(dados.negocios), nota: undefined },
    { label: 'Notas emitidas no mês', valor: String(dados.notasNoMes), nota: 'NFS-e, NF-e e NFC-e autorizadas' },
    { label: 'Valor faturado no mês', valor: REAIS(dados.valorFaturadoNoMes), nota: 'notas autorizadas' },
    { label: 'Certificados vencendo', valor: String(dados.certificadosVencendo), nota: 'em até 30 dias ou já vencidos' },
  ]

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cartoes.map(c => (
          <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">{c.label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{c.valor}</p>
            {c.nota && <p className="mt-1 text-xs text-slate-400">{c.nota}</p>}
          </div>
        ))}
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold text-slate-900">Atenção</h2>
      {atencao.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 py-10 text-center text-sm text-slate-400">
          Nada pedindo atenção agora.
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {atencao.map(item => (
            <li key={item.chave}>
              <Link href={`/admin/tenant/${item.businessId}`} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-slate-50">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">{item.titulo}</p>
                  {item.detalhe && <p className="mt-0.5 truncate text-xs text-slate-400">{item.detalhe}</p>}
                </div>
                <span className="shrink-0 text-xs font-medium text-blue-600">Abrir →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 text-xs text-slate-400">
        Este painel mostra só números e dados de conta. Ele não abre clientes, cobranças nem conteúdo de notas.
      </p>
    </div>
  )
}
