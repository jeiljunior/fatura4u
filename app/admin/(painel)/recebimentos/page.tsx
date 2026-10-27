import Link from 'next/link'
import { requirePlatformAdminMfa } from '@/lib/platformAdmin'
import { recebimentosDoMes, mesValido, deslocarMes, rotuloMes, mesAtualBRT } from '@/lib/adminData'

export const dynamic = 'force-dynamic'

const REAIS = (cents: number) => `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

export default async function RecebimentosPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  await requirePlatformAdminMfa()
  const { mes: mesParam } = await searchParams
  const mes = mesValido(mesParam)
  const linhas = await recebimentosDoMes(mes)

  const totalCents = linhas.reduce((s, l) => s + l.valorCents, 0)
  const totalPagamentos = linhas.reduce((s, l) => s + l.pagamentos, 0)
  const totalNotas = linhas.reduce((s, l) => s + l.notas, 0)
  const totalSemNota = linhas.reduce((s, l) => s + l.semNota, 0)
  const ehMesAtual = mes === mesAtualBRT()

  const cartoes = [
    { label: 'Total recebido', valor: REAIS(totalCents), nota: `${totalPagamentos} pagamento(s)`, alerta: false },
    { label: 'Notas autorizadas', valor: String(totalNotas), nota: 'NFS-e, NF-e e NFC-e', alerta: false },
    { label: 'Pagamentos sem nota', valor: String(totalSemNota), nota: totalSemNota ? 'recebidos sem nota vinculada' : 'tudo conferido', alerta: totalSemNota > 0 },
  ]

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold capitalize text-zinc-900">Recebimentos — {rotuloMes(mes)}</h2>
        <a href={`/api/admin/recebimentos?mes=${mes}`} className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50">
          Baixar CSV do mês
        </a>
      </div>
      <p className="mb-4 text-sm text-zinc-500">
        Pagamentos recebidos e notas autorizadas em cada empresa, para conferir se tudo que entrou foi faturado. O mês vai do dia 1º ao último dia, no horário de Brasília.
      </p>

      <div className="mb-4 flex gap-2 text-sm">
        <Link href={`/admin/recebimentos?mes=${deslocarMes(mes, -1)}`} className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-zinc-600 hover:bg-zinc-50">← Mês anterior</Link>
        {!ehMesAtual && (
          <Link href={`/admin/recebimentos?mes=${deslocarMes(mes, 1)}`} className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-zinc-600 hover:bg-zinc-50">Próximo mês →</Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cartoes.map(c => (
          <div key={c.label} className="rounded-xl border border-zinc-200 bg-white p-5">
            <p className="text-sm text-zinc-500">{c.label}</p>
            <p className={`mt-1 text-2xl font-bold ${c.alerta ? 'text-amber-600' : 'text-zinc-900'}`}>{c.valor}</p>
            <p className="mt-1 text-xs text-zinc-400">{c.nota}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs uppercase tracking-wider text-zinc-500">
              <th className="px-5 py-3 font-semibold">Empresa</th>
              <th className="px-5 py-3 font-semibold">Pagamentos</th>
              <th className="px-5 py-3 font-semibold">Valor recebido</th>
              <th className="px-5 py-3 font-semibold">Notas autorizadas</th>
              <th className="px-5 py-3 font-semibold">Sem nota</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {linhas.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-zinc-400">Nenhuma empresa cadastrada.</td></tr>}
            {linhas.map(l => (
              <tr key={l.id} className="hover:bg-zinc-50">
                <td className="px-5 py-3 font-semibold text-zinc-900">{l.name}</td>
                <td className="px-5 py-3 text-zinc-600">{l.pagamentos}</td>
                <td className="px-5 py-3 text-zinc-600">{REAIS(l.valorCents)}</td>
                <td className="px-5 py-3 text-zinc-600">{l.notas}</td>
                <td className={`px-5 py-3 ${l.semNota > 0 ? 'font-semibold text-amber-600' : 'text-zinc-400'}`}>{l.semNota}</td>
                <td className="px-5 py-3"><Link href={`/admin/empresas/${l.id}`} className="text-xs font-medium text-blue-600 hover:underline">Abrir →</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-xs text-zinc-400">
        Só números por empresa: o painel não mostra clientes, cobranças individuais nem conteúdo de notas. Cada download de CSV fica no Registro de ações.
      </p>
    </div>
  )
}
