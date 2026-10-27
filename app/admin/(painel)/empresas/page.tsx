import Link from 'next/link'
import { requirePlatformAdminMfa } from '@/lib/platformAdmin'
import { listarNegocios } from '@/lib/adminData'
import { diasAte } from '@/lib/dateBrt'

export const dynamic = 'force-dynamic'

function certificadoTexto(validoAte: string | null) {
  if (!validoAte) return { texto: 'Sem certificado', cor: 'text-zinc-400' }
  const dias = diasAte(validoAte)
  const data = new Date(`${validoAte}T12:00:00`).toLocaleDateString('pt-BR')
  if (dias < 0) return { texto: `Vencido em ${data}`, cor: 'text-red-600' }
  if (dias <= 30) return { texto: `Vence em ${data}`, cor: 'text-amber-600' }
  return { texto: `Válido até ${data}`, cor: 'text-zinc-600' }
}

export default async function NegociosPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requirePlatformAdminMfa()
  const { q } = await searchParams
  const busca = q?.trim() || undefined
  const negocios = await listarNegocios(busca)

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold text-zinc-900">Empresas</h2>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <form className="flex gap-2">
          <input name="q" defaultValue={busca} placeholder="Buscar pelo nome"
            className="w-64 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm" />
          <button className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50">Buscar</button>
        </form>
        <Link href="/admin/novo" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white">+ Nova empresa</Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs uppercase tracking-wider text-zinc-500">
              <th className="px-5 py-3 font-semibold">Empresa</th>
              <th className="px-5 py-3 font-semibold">Ambiente</th>
              <th className="px-5 py-3 font-semibold">Certificado</th>
              <th className="px-5 py-3 font-semibold">Clientes</th>
              <th className="px-5 py-3 font-semibold">Cobranças</th>
              <th className="px-5 py-3 font-semibold">Notas</th>
              <th className="px-5 py-3 font-semibold">Desde</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {negocios.length === 0 && (
              <tr><td colSpan={8} className="px-5 py-10 text-center text-zinc-400">Nenhuma empresa encontrada.</td></tr>
            )}
            {negocios.map(n => {
              const cert = certificadoTexto(n.certificadoValidoAte)
              return (
                <tr key={n.id} className="hover:bg-zinc-50">
                  <td className="px-5 py-3">
                    <p className="font-semibold text-zinc-900">{n.name}</p>
                    <p className="text-xs text-zinc-400">{n.responsavel ?? '—'}</p>
                  </td>
                  <td className="px-5 py-3 text-zinc-600">
                    {n.ambiente === 'producao' ? 'Produção' : n.ambiente === 'homologacao' ? 'Homologação' : '—'}
                    {!n.ativo && <span className="ml-2 text-xs text-zinc-400">(faturamento inativo)</span>}
                  </td>
                  <td className={`px-5 py-3 text-xs ${cert.cor}`}>{cert.texto}</td>
                  <td className="px-5 py-3 text-zinc-600">{n.clientes}</td>
                  <td className="px-5 py-3 text-zinc-600">{n.cobrancas}</td>
                  <td className="px-5 py-3 text-zinc-600">{n.notas}</td>
                  <td className="px-5 py-3 text-xs text-zinc-400">{new Date(n.created_at).toLocaleDateString('pt-BR')}</td>
                  <td className="px-5 py-3">
                    <Link href={`/admin/empresas/${n.id}`} className="text-xs font-medium text-blue-600 hover:underline">Gerenciar →</Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
