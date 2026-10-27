import { notFound } from 'next/navigation'
import Link from 'next/link'
import supabaseAdmin from '@/lib/supabase/admin'
import { requirePlatformAdminMfa } from '@/lib/platformAdmin'
import ImpersonateButton from './ImpersonateButton'
import DeleteTenantButton from './DeleteTenantButton'
import WhatsappConfigAdmin from './WhatsappConfigAdmin'
import { maskCPF, maskCNPJ } from '@/lib/masks'

const CHARGE_STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente', confirmada: 'Confirmada', recebida: 'Recebida', vencida: 'Vencida', cancelada: 'Cancelada',
}
const CHARGE_STATUS_COLOR: Record<string, string> = {
  pendente: 'bg-amber-100 text-amber-700', confirmada: 'bg-blue-100 text-blue-700',
  recebida: 'bg-emerald-100 text-emerald-700', vencida: 'bg-red-100 text-red-700', cancelada: 'bg-zinc-100 text-zinc-500',
}
const INVOICE_STATUS_LABEL: Record<string, string> = {
  rascunho: 'Rascunho', processando: 'Processando', autorizada: 'Autorizada', rejeitada: 'Rejeitada', cancelada: 'Cancelada',
}
const INVOICE_STATUS_COLOR: Record<string, string> = {
  rascunho: 'bg-zinc-100 text-zinc-500', processando: 'bg-amber-100 text-amber-700',
  autorizada: 'bg-emerald-100 text-emerald-700', rejeitada: 'bg-red-100 text-red-700', cancelada: 'bg-zinc-100 text-zinc-500',
}

function fmt(cents: number) {
  return `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
}

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  await requirePlatformAdminMfa()

  const { data: biz } = await supabaseAdmin
    .from('businesses')
    .select('*')
    .eq('id', id)
    .single()

  if (!biz) notFound()

  const [
    { data: members },
    { count: totalClientes },
    { count: totalCobrancas },
    { count: totalNotas },
    { data: faturamentoConfig },
    { data: certificado },
    { data: gateways },
    { data: recentCharges },
    { data: recentInvoices },
    { data: whatsappConfig },
  ] = await Promise.all([
    supabaseAdmin.from('profiles').select('id, full_name, role, created_at').eq('business_id', id).order('created_at'),
    supabaseAdmin.from('customers').select('*', { count: 'exact', head: true }).eq('business_id', id),
    supabaseAdmin.from('charges').select('*', { count: 'exact', head: true }).eq('business_id', id),
    supabaseAdmin.from('invoices').select('*', { count: 'exact', head: true }).eq('business_id', id),
    supabaseAdmin.from('faturamento_config').select('active, regime_tributario, ambiente, municipio_ibge, emissao_automatica').eq('business_id', id).maybeSingle(),
    supabaseAdmin.from('certificados_digitais').select('valido_ate').eq('business_id', id).maybeSingle(),
    supabaseAdmin.from('gateway_credentials').select('provider, active').eq('business_id', id),
    supabaseAdmin.from('charges').select('id, valor_cents, billing_type, status, created_at').eq('business_id', id).order('created_at', { ascending: false }).limit(10),
    supabaseAdmin.from('invoices').select('id, valor_servicos, status, created_at').eq('business_id', id).order('created_at', { ascending: false }).limit(10),
    supabaseAdmin.from('whatsapp_config').select('instance, token, phone, active').eq('business_id', id).maybeSingle(),
  ])

  // Email de login não fica em `profiles` (vive em auth.users) — busca separada por usuário.
  const membersWithEmail = await Promise.all(
    (members ?? []).map(async m => {
      const { data } = await supabaseAdmin.auth.admin.getUserById(m.id)
      return { ...m, email: data.user?.email ?? null }
    })
  )

  const dono = membersWithEmail.find(m => m.role === 'owner') ?? membersWithEmail[0]

  return (
    <div>
      <Link href="/admin/empresas" className="text-sm text-zinc-500 hover:text-zinc-900">← Empresas</Link>
      <div className="mb-6 mt-2 flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-semibold text-zinc-900">{biz.name}</h2>
        {faturamentoConfig?.active && (
          <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">Faturamento ativo</span>
        )}
      </div>
      <p className="-mt-4 mb-6 text-sm text-zinc-500">
        Proprietário: {dono?.email ?? '—'} · criada em {new Date(biz.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' })}
      </p>

        <div className="space-y-6">

          {/* Ações rápidas */}
          <div className="bg-white rounded-xl border border-zinc-200 p-5 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="font-semibold text-zinc-900 text-sm">Suporte</p>
              <p className="text-zinc-400 text-xs mt-0.5">Veja o app exatamente como esta empresa vê</p>
            </div>
            <ImpersonateButton businessId={id} />
          </div>

          {/* Info cards */}
          <div className="grid grid-cols-2 gap-6">

            <div className="bg-white rounded-xl border border-zinc-200 p-6">
              <h2 className="font-bold text-zinc-900 mb-4">🏢 Dados da empresa</h2>
              <dl className="space-y-3">
                <Row label="Nome" value={biz.name} />
                <Row label="Slug" value={biz.slug ?? '—'} mono />
                {biz.document_number && <Row label={biz.document_type === 'cnpj' ? 'CNPJ' : 'CPF'} value={biz.document_type === 'cnpj' ? maskCNPJ(biz.document_number) : maskCPF(biz.document_number)} mono />}
                {biz.razao_social && <Row label="Razão Social" value={biz.razao_social} />}
                {biz.address_city && <Row label="Cidade/UF" value={`${biz.address_city}${biz.address_state ? ' / ' + biz.address_state : ''}`} />}
                <Row label="Cadastrado em" value={new Date(biz.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })} />
              </dl>
            </div>

            <div className="bg-white rounded-xl border border-zinc-200 p-6">
              <h2 className="font-bold text-zinc-900 mb-4">🧾 Faturamento</h2>
              <dl className="space-y-3">
                <Row label="Ativo" value={faturamentoConfig?.active ? 'Sim' : 'Não'} />
                <Row label="Regime tributário" value={faturamentoConfig?.regime_tributario ?? '—'} />
                <Row label="Ambiente" value={faturamentoConfig?.ambiente ?? '—'} />
                <Row label="Emissão automática" value={faturamentoConfig?.emissao_automatica ? 'Sim' : 'Não'} />
                <Row label="Certificado digital" value={certificado?.valido_ate ? `Válido até ${certificado.valido_ate}` : 'Não cadastrado'} />
                <Row label="Gateway conectado" value={gateways && gateways.length > 0 ? gateways.map(g => g.provider).join(', ') : 'Nenhum'} />
              </dl>
            </div>
          </div>

          {/* WhatsApp (régua de cobrança) */}
          <div className="bg-white rounded-xl border border-zinc-200 p-6">
            <h2 className="font-bold text-zinc-900 mb-1">📱 WhatsApp (régua de cobrança)</h2>
            <p className="text-zinc-400 text-xs mb-4">Instância Z-API provisionada manualmente — não é self-service pro tenant</p>
            <WhatsappConfigAdmin businessId={id} initial={whatsappConfig ?? null} />
          </div>

          {/* Métricas de uso */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Clientes', value: totalClientes ?? 0, icon: '👥', color: 'text-emerald-700', bg: 'bg-emerald-50' },
              { label: 'Cobranças', value: totalCobrancas ?? 0, icon: '💲', color: 'text-blue-700', bg: 'bg-blue-50' },
              { label: 'Notas emitidas', value: totalNotas ?? 0, icon: '🧾', color: 'text-violet-700', bg: 'bg-violet-50' },
            ].map(card => (
              <div key={card.label} className="bg-white rounded-xl border border-zinc-200 p-5">
                <div className={`w-9 h-9 ${card.bg} rounded-xl flex items-center justify-center text-base mb-3`}>{card.icon}</div>
                <p className={`text-2xl font-black ${card.color}`}>{card.value}</p>
                <p className="text-zinc-400 text-xs mt-1">{card.label}</p>
              </div>
            ))}
          </div>

          {/* Usuários */}
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100">
              <h3 className="font-bold text-zinc-900">Usuários da conta</h3>
            </div>
            {membersWithEmail.length === 0 ? (
              <p className="px-6 py-8 text-sm text-zinc-400 text-center">Nenhum usuário vinculado</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50 text-xs text-zinc-500 uppercase tracking-wider">
                    <th className="text-left px-6 py-3 font-semibold">Nome</th>
                    <th className="text-left px-6 py-3 font-semibold">E-mail (login)</th>
                    <th className="text-left px-6 py-3 font-semibold">Papel</th>
                    <th className="text-left px-6 py-3 font-semibold">Desde</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {membersWithEmail.map((m) => (
                    <tr key={m.id} className="hover:bg-zinc-50">
                      <td className="px-6 py-3 font-medium text-zinc-900">{m.full_name}</td>
                      <td className="px-6 py-3 text-zinc-600 font-mono text-xs">{m.email ?? '—'}</td>
                      <td className="px-6 py-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${m.role === 'owner' ? 'bg-blue-100 text-blue-700' : 'bg-zinc-100 text-zinc-600'}`}>
                          {m.role}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-zinc-400 text-xs">
                        {new Date(m.created_at).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Últimas cobranças */}
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100">
              <h3 className="font-bold text-zinc-900">Últimas cobranças</h3>
            </div>
            {!recentCharges || recentCharges.length === 0 ? (
              <p className="px-6 py-8 text-sm text-zinc-400 text-center">Nenhuma cobrança ainda</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50 text-xs text-zinc-500 uppercase tracking-wider">
                    <th className="text-left px-6 py-3 font-semibold">Valor</th>
                    <th className="text-left px-6 py-3 font-semibold">Tipo</th>
                    <th className="text-left px-6 py-3 font-semibold">Status</th>
                    <th className="text-left px-6 py-3 font-semibold">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {recentCharges.map((c) => {
                    return (
                      <tr key={c.id} className="hover:bg-zinc-50">
                        <td className="px-6 py-3 text-zinc-700">{fmt(c.valor_cents)}</td>
                        <td className="px-6 py-3 text-zinc-500 uppercase text-xs font-semibold">{c.billing_type}</td>
                        <td className="px-6 py-3">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${CHARGE_STATUS_COLOR[c.status]}`}>{CHARGE_STATUS_LABEL[c.status]}</span>
                        </td>
                        <td className="px-6 py-3 text-zinc-400 text-xs">{new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Últimas notas */}
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-100">
              <h3 className="font-bold text-zinc-900">Últimas notas fiscais</h3>
            </div>
            {!recentInvoices || recentInvoices.length === 0 ? (
              <p className="px-6 py-8 text-sm text-zinc-400 text-center">Nenhuma nota emitida ainda</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50 text-xs text-zinc-500 uppercase tracking-wider">
                    <th className="text-left px-6 py-3 font-semibold">Valor</th>
                    <th className="text-left px-6 py-3 font-semibold">Status</th>
                    <th className="text-left px-6 py-3 font-semibold">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {recentInvoices.map((inv) => {
                    return (
                      <tr key={inv.id} className="hover:bg-zinc-50">
                        <td className="px-6 py-3 text-zinc-700">R$ {inv.valor_servicos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-3">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${INVOICE_STATUS_COLOR[inv.status]}`}>{INVOICE_STATUS_LABEL[inv.status]}</span>
                        </td>
                        <td className="px-6 py-3 text-zinc-400 text-xs">{new Date(inv.created_at).toLocaleDateString('pt-BR')}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Zona de risco */}
          <div className="bg-red-50 rounded-xl border border-red-200 p-5 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="font-semibold text-red-800 text-sm">Zona de risco</p>
              <p className="text-red-500 text-xs mt-0.5">Excluir esta empresa apaga todos os dados permanentemente</p>
            </div>
            <DeleteTenantButton businessId={id} businessName={biz.name} />
          </div>

        </div>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <dt className="text-zinc-400 shrink-0">{label}</dt>
      <dd className={`text-zinc-800 text-right truncate ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  )
}
