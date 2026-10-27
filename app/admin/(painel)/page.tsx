import Link from 'next/link'
import { requirePlatformAdminMfa } from '@/lib/platformAdmin'
import { visaoGeral, listaAtencao } from '@/lib/adminData'

export const dynamic = 'force-dynamic'

const REAIS = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

export default async function VisaoGeralPage() {
  await requirePlatformAdminMfa()
  const [dados, atencao] = await Promise.all([visaoGeral(), listaAtencao()])

  const cartoes = [
    { label: 'Empresas', valor: String(dados.negocios), nota: undefined },
    { label: 'Notas emitidas no mês', valor: String(dados.notasNoMes), nota: 'NFS-e, NF-e e NFC-e autorizadas' },
    { label: 'Valor faturado no mês', valor: REAIS(dados.valorFaturadoNoMes), nota: 'notas autorizadas' },
    { label: 'Certificados vencendo', valor: String(dados.certificadosVencendo), nota: 'em até 30 dias ou já vencidos' },
  ]

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cartoes.map(c => (
          <div key={c.label} className="rounded-xl border border-zinc-200 bg-white p-5">
            <p className="text-sm text-zinc-500">{c.label}</p>
            <p className="mt-1 text-3xl font-semibold text-zinc-900">{c.valor}</p>
            {c.nota && <p className="mt-1 text-xs text-zinc-500">{c.nota}</p>}
          </div>
        ))}
      </div>

      <h2 className="mb-2 mt-8 text-base font-medium text-zinc-900">Atenção</h2>
      {atencao.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 py-10 text-center text-sm text-zinc-500">
          Nada pedindo atenção agora.
        </div>
      ) : (
        <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white">
          {atencao.map(item => (
            <li key={item.chave}>
              <Link href={`/admin/empresas/${item.businessId}`} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-zinc-50">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-800">{item.titulo}</p>
                  {item.detalhe && <p className="mt-0.5 truncate text-xs text-zinc-400">{item.detalhe}</p>}
                </div>
                <span className="shrink-0 text-xs font-medium text-blue-600">Abrir →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 text-xs text-zinc-500">
        Este painel mostra só números e dados de conta. Ele não abre clientes, cobranças nem conteúdo de notas.
      </p>
    </div>
  )
}
