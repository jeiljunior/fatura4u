import Link from 'next/link'
import { requirePlatformAdminMfa } from '@/lib/platformAdmin'
import { ultimasAcoes } from '@/lib/adminData'

export const dynamic = 'force-dynamic'

const ROTULO: Record<string, string> = {
  'impersonate.start': 'Entrou no modo suporte',
  'impersonate.end': 'Encerrou o modo suporte',
  'tenant.created': 'Negócio criado',
  'tenant.deleted': 'Negócio excluído',
  'whatsapp.config_updated': 'WhatsApp configurado',
  'recebimentos.csv_baixado': 'Baixou o CSV de recebimentos',
}

const FORMATO_DATA = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'medium',
})

// Dados da ação em texto curto. Nunca exibe segredos: o registro já não os guarda.
function resumoMeta(meta: Record<string, unknown>): string {
  return Object.entries(meta)
    .filter(([k]) => k !== 'business_name')
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    .join(' · ')
}

export default async function AuditoriaPage() {
  await requirePlatformAdminMfa()
  const acoes = await ultimasAcoes(100)

  return (
    <div>
      <h2 className="text-lg font-bold text-slate-900">Registro de ações</h2>
      <p className="mb-4 text-sm text-slate-500">
        Tudo que o administrador geral fez no painel. O registro só se acrescenta: não pode ser alterado nem apagado. Mostra as 100 mais recentes.
      </p>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {acoes.length === 0 && <p className="px-5 py-10 text-center text-sm text-slate-400">Nenhuma ação registrada ainda.</p>}
        <ul className="divide-y divide-slate-100">
          {acoes.map(a => (
            <li key={a.id} className="flex flex-wrap items-start justify-between gap-x-6 gap-y-1 px-5 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">
                  {ROTULO[a.action] ?? a.action}
                  {a.businessName && (
                    <span className="font-normal text-slate-500">
                      {' — '}
                      {a.business_id && a.negocioExiste
                        ? <Link href={`/admin/tenant/${a.business_id}`} className="text-blue-600 hover:underline">{a.businessName}</Link>
                        : a.businessName}
                    </span>
                  )}
                </p>
                {resumoMeta(a.meta) && <p className="mt-0.5 break-words text-xs text-slate-400">{resumoMeta(a.meta)}</p>}
              </div>
              <p className="shrink-0 text-xs text-slate-400">
                {FORMATO_DATA.format(new Date(a.created_at))} · {a.admin_email ?? '—'}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
