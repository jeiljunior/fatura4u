import Link from 'next/link'
import { requirePlatformAdminMfa } from '@/lib/platformAdmin'
import { listarComunicados } from '@/lib/comunicados'
import NovoComunicadoButton from './NovoComunicadoButton'

export const dynamic = 'force-dynamic'

const SITUACAO: Record<string, string> = { rascunho: 'Rascunho', enviando: 'Enviando', concluido: 'Concluído', cancelado: 'Cancelado' }

const FORMATO = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' })

export default async function ComunicadosPage() {
  await requirePlatformAdminMfa()
  const lista = await listarComunicados()

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900">Comunicados (mala direta)</h2>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">
            E-mails com novidades e informações para os usuários do FATUR4U. Cada e-mail leva o link para cancelar a inscrição, e o envio é em lotes pequenos por dia.
          </p>
        </div>
        <NovoComunicadoButton />
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-left text-xs uppercase tracking-wider text-zinc-500">
              <th className="px-5 py-3 font-medium">Comunicado</th>
              <th className="px-5 py-3 font-medium">Situação</th>
              <th className="px-5 py-3 font-medium">Enviados</th>
              <th className="px-5 py-3 font-medium">Na fila</th>
              <th className="px-5 py-3 font-medium">Falhas / Pulados</th>
              <th className="px-5 py-3 font-medium">Criado em</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {lista.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-zinc-500">Nenhum comunicado ainda.</td></tr>}
            {lista.map(c => (
              <tr key={c.id} className="hover:bg-zinc-50">
                <td className="px-5 py-3">
                  <Link href={`/admin/comunicados/${c.id}`} className="font-medium text-blue-700 hover:underline">{c.assunto || '(sem assunto)'}</Link>
                </td>
                <td className="px-5 py-3 text-zinc-600">{SITUACAO[c.status] ?? c.status}</td>
                <td className="px-5 py-3 text-zinc-600">{c.enviados}</td>
                <td className="px-5 py-3 text-zinc-600">{c.naFila}</td>
                <td className="px-5 py-3 text-zinc-600">{c.falhasOuPulados}</td>
                <td className="px-5 py-3 text-xs text-zinc-500">{FORMATO.format(new Date(c.created_at))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
