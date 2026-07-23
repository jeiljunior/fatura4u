import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import supabaseAdmin from '@/lib/supabase/admin'
import ImpersonateButton from './ImpersonateButton'
import DeleteTenantButton from './DeleteTenantButton'
import WhatsappConfigAdmin from './WhatsappConfigAdmin'

const CHARGE_STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente', confirmada: 'Confirmada', recebida: 'Recebida', vencida: 'Vencida', cancelada: 'Cancelada',
}
const CHARGE_STATUS_COLOR: Record<string, string> = {
  pendente: 'bg-amber-100 text-amber-700', confirmada: 'bg-blue-100 text-blue-700',
  recebida: 'bg-emerald-100 text-emerald-700', vencida: 'bg-red-100 text-red-700', cancelada: 'bg-slate-100 text-slate-500',
}
const INVOICE_STATUS_LABEL: Record<string, string> = {
  rascunho: 'Rascunho', processando: 'Processando', autorizada: 'Autorizada', rejeitada: 'Rejeitada', cancelada: 'Cancelada',
}
const INVOICE_STATUS_COLOR: Record<string, string> = {
  rascunho: 'bg-slate-100 text-slate-500', processando: 'bg-amber-100 text-amber-700',
  autorizada: 'bg-emerald-100 text-emerald-700', rejeitada: 'bg-red-100 text-red-700', cancelada: 'bg-slate-100 text-slate-500',
}

function fmt(cents: number) {
  return `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
}

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('super_admin, full_name')
    .eq('id', user.id)
    .single()

  if (!adminProfile?.super_admin) redirect('/dashboard')

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
    supabaseAdmin.from('charges').select('id, valor_cents, billing_type, status, created_at, customers(name)').eq('business_id', id).order('created_at', { ascending: false }).limit(10),
    supabaseAdmin.from('invoices').select('id, valor_servicos, status, created_at, customers(name)').eq('business_id', id).order('created_at', { ascending: false }).limit(10),
    supabaseAdmin.from('whatsapp_config').select('instance, token, phone, active').eq('business_id', id).maybeSingle(),
  ])

  // Email de login não fica em `profiles` (vive em auth.users) — busca separada por usuário.
  const membersWithEmail = await Promise.all(
    (members ?? []).map(async m => {
      const { data } = await supabaseAdmin.auth.admin.getUserById(m.id)
      return { ...m, email: data.user?.email ?? null }
    })
  )

  return (
    <div className="flex min-h-screen bg-slate-50">

      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 flex flex-col fixed top-0 left-0 h-full z-10">
        <div className="px-6 py-6 border-b border-slate-700/50">
          <span className="text-white font-black text-xl tracking-tight">
            FATUR<span className="text-blue-400">4U</span>
          </span>
          <span className="mt-2 inline-block text-xs font-bold bg-amber-400 text-amber-900 px-2 py-0.5 rounded-full">
            SUPER ADMIN
          </span>
        </div>
        <div className="px-6 py-5 border-b border-slate-700/50">
          <p className="text-white text-sm font-semibold">{adminProfile.full_name}</p>
          <p className="text-slate-400 text-xs">Administrador geral</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          <Link href="/admin"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-700/60 text-white text-sm font-medium">
            🏢 Tenants
          </Link>
        </nav>
        <div className="px-4 pb-5 border-t border-slate-700/50 pt-4">
          <form action="/auth/logout" method="post">
            <button className="w-full text-slate-400 hover:text-white text-sm py-2 hover:bg-slate-700/40 rounded-lg transition">
              Sair
            </button>
          </form>
        </div>
      </aside>

      {/* Conteúdo */}
      <main className="flex-1 ml-64 min-h-screen">

        <div className="bg-white border-b border-slate-200 px-8 py-5 flex items-center gap-3">
          <Link href="/admin" className="text-slate-400 hover:text-slate-700 transition text-sm font-medium">
            ← Tenants
          </Link>
          <span className="text-slate-300">/</span>
          <h1 className="text-xl font-bold text-slate-900">{biz.name}</h1>
          {faturamentoConfig?.active && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full border bg-emerald-100 text-emerald-700 border-emerald-200">
              Faturamento ativo
            </span>
          )}
        </div>

        <div className="px-8 py-8 space-y-6">

          {/* Ações rápidas */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="font-semibold text-slate-900 text-sm">Suporte</p>
              <p className="text-slate-400 text-xs mt-0.5">Veja o painel exatamente como o tenant vê</p>
            </div>
            <ImpersonateButton businessId={id} />
          </div>

          {/* Info cards */}
          <div className="grid grid-cols-2 gap-6">

            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="font-bold text-slate-900 mb-4">🏢 Dados da empresa</h2>
              <dl className="space-y-3">
                <Row label="Nome" value={biz.name} />
                <Row label="Slug" value={biz.slug ?? '—'} mono />
                {biz.document_number && <Row label={biz.document_type === 'cnpj' ? 'CNPJ' : 'CPF'} value={biz.document_number} mono />}
                {biz.razao_social && <Row label="Razão Social" value={biz.razao_social} />}
                {biz.address_city && <Row label="Cidade/UF" value={`${biz.address_city}${biz.address_state ? ' / ' + biz.address_state : ''}`} />}
                <Row label="Cadastrado em" value={new Date(biz.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })} />
              </dl>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="font-bold text-slate-900 mb-4">🧾 Faturamento</h2>
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
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="font-bold text-slate-900 mb-1">📱 WhatsApp (régua de cobrança)</h2>
            <p className="text-slate-400 text-xs mb-4">Instância Z-API provisionada manualmente — não é self-service pro tenant</p>
            <WhatsappConfigAdmin businessId={id} initial={whatsappConfig ?? null} />
          </div>

          {/* Métricas de uso */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Clientes', value: totalClientes ?? 0, icon: '👥', color: 'text-emerald-700', bg: 'bg-emerald-50' },
              { label: 'Cobranças', value: totalCobrancas ?? 0, icon: '💲', color: 'text-blue-700', bg: 'bg-blue-50' },
              { label: 'Notas emitidas', value: totalNotas ?? 0, icon: '🧾', color: 'text-violet-700', bg: 'bg-violet-50' },
            ].map(card => (
              <div key={card.label} className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className={`w-9 h-9 ${card.bg} rounded-xl flex items-center justify-center text-base mb-3`}>{card.icon}</div>
                <p className={`text-2xl font-black ${card.color}`}>{card.value}</p>
                <p className="text-slate-400 text-xs mt-1">{card.label}</p>
              </div>
            ))}
          </div>

          {/* Usuários */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Usuários da conta</h3>
            </div>
            {membersWithEmail.length === 0 ? (
              <p className="px-6 py-8 text-sm text-slate-400 text-center">Nenhum usuário vinculado</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                    <th className="text-left px-6 py-3 font-semibold">Nome</th>
                    <th className="text-left px-6 py-3 font-semibold">E-mail (login)</th>
                    <th className="text-left px-6 py-3 font-semibold">Papel</th>
                    <th className="text-left px-6 py-3 font-semibold">Desde</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {membersWithEmail.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-medium text-slate-900">{m.full_name}</td>
                      <td className="px-6 py-3 text-slate-600 font-mono text-xs">{m.email ?? '—'}</td>
                      <td className="px-6 py-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${m.role === 'owner' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                          {m.role}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-slate-400 text-xs">
                        {new Date(m.created_at).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Últimas cobranças */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Últimas cobranças</h3>
            </div>
            {!recentCharges || recentCharges.length === 0 ? (
              <p className="px-6 py-8 text-sm text-slate-400 text-center">Nenhuma cobrança ainda</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                    <th className="text-left px-6 py-3 font-semibold">Cliente</th>
                    <th className="text-left px-6 py-3 font-semibold">Valor</th>
                    <th className="text-left px-6 py-3 font-semibold">Tipo</th>
                    <th className="text-left px-6 py-3 font-semibold">Status</th>
                    <th className="text-left px-6 py-3 font-semibold">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentCharges.map((c) => {
                    const customer = Array.isArray(c.customers) ? c.customers[0] : c.customers
                    return (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="px-6 py-3 font-medium text-slate-900">{customer?.name ?? '—'}</td>
                        <td className="px-6 py-3 text-slate-700">{fmt(c.valor_cents)}</td>
                        <td className="px-6 py-3 text-slate-500 uppercase text-xs font-semibold">{c.billing_type}</td>
                        <td className="px-6 py-3">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${CHARGE_STATUS_COLOR[c.status]}`}>{CHARGE_STATUS_LABEL[c.status]}</span>
                        </td>
                        <td className="px-6 py-3 text-slate-400 text-xs">{new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Últimas notas */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Últimas notas fiscais</h3>
            </div>
            {!recentInvoices || recentInvoices.length === 0 ? (
              <p className="px-6 py-8 text-sm text-slate-400 text-center">Nenhuma nota emitida ainda</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                    <th className="text-left px-6 py-3 font-semibold">Cliente</th>
                    <th className="text-left px-6 py-3 font-semibold">Valor</th>
                    <th className="text-left px-6 py-3 font-semibold">Status</th>
                    <th className="text-left px-6 py-3 font-semibold">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentInvoices.map((inv) => {
                    const customer = Array.isArray(inv.customers) ? inv.customers[0] : inv.customers
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50">
                        <td className="px-6 py-3 font-medium text-slate-900">{customer?.name ?? '—'}</td>
                        <td className="px-6 py-3 text-slate-700">R$ {inv.valor_servicos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-3">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${INVOICE_STATUS_COLOR[inv.status]}`}>{INVOICE_STATUS_LABEL[inv.status]}</span>
                        </td>
                        <td className="px-6 py-3 text-slate-400 text-xs">{new Date(inv.created_at).toLocaleDateString('pt-BR')}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Zona de risco */}
          <div className="bg-red-50 rounded-2xl border border-red-200 p-5 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="font-semibold text-red-800 text-sm">Zona de risco</p>
              <p className="text-red-500 text-xs mt-0.5">Excluir este tenant apaga todos os dados permanentemente</p>
            </div>
            <DeleteTenantButton businessId={id} businessName={biz.name} />
          </div>

        </div>
      </main>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <dt className="text-slate-400 shrink-0">{label}</dt>
      <dd className={`text-slate-800 text-right truncate ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  )
}
