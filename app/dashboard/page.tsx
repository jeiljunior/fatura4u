import { redirect } from 'next/navigation'
import Link from 'next/link'
import supabaseAdmin from '@/lib/supabase/admin'
import { getEffectiveBusinessId } from '@/lib/getBusinessId'
import { buscarSaldoProjetado } from '@/lib/financeiro/saldoProjetado'
import SaldoProjetadoCard from '@/components/SaldoProjetadoCard'

export default async function DashboardHome() {
  const effective = await getEffectiveBusinessId()
  if (!effective) redirect('/login')
  const businessId = effective.businessId

  const [{ count: totalClientes }, { count: cobrancasPendentes }, { count: notasEmitidas }, { data: business }] = await Promise.all([
    supabaseAdmin.from('customers').select('*', { count: 'exact', head: true }).eq('business_id', businessId),
    supabaseAdmin.from('charges').select('*', { count: 'exact', head: true }).eq('business_id', businessId).eq('status', 'pendente'),
    supabaseAdmin.from('invoices').select('*', { count: 'exact', head: true }).eq('business_id', businessId).eq('status', 'autorizada'),
    supabaseAdmin.from('businesses').select('saldo_caixa_cents').eq('id', businessId).single(),
  ])

  const saldoAtualCents = business?.saldo_caixa_cents ?? 0
  const [projecao7, projecao15, projecao30] = await Promise.all(
    [7, 15, 30].map(dias => buscarSaldoProjetado(supabaseAdmin, businessId, saldoAtualCents, dias))
  )

  const cards = [
    { label: 'Clientes cadastrados', value: totalClientes ?? 0, href: '/dashboard/clientes', icon: '👥' },
    { label: 'Cobranças pendentes', value: cobrancasPendentes ?? 0, href: '/dashboard/cobrancas', icon: '💲' },
    { label: 'Notas emitidas', value: notasEmitidas ?? 0, href: '/dashboard/notas', icon: '🧾' },
  ]

  return (
    <main className="min-h-screen">
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <h1 className="text-xl font-bold text-slate-900">Início</h1>
      </div>
      <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map(c => (
          <Link key={c.href} href={c.href}
            className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-300 transition">
            <div className="text-2xl mb-2">{c.icon}</div>
            <p className="text-2xl font-black text-slate-900">{c.value}</p>
            <p className="text-slate-400 text-sm">{c.label}</p>
          </Link>
        ))}
        <SaldoProjetadoCard
          data={{
            saldoAtualCents,
            projecoes: {
              7: { saldoProjetadoCents: projecao7.saldoProjetadoCents, negativo: projecao7.negativo },
              15: { saldoProjetadoCents: projecao15.saldoProjetadoCents, negativo: projecao15.negativo },
              30: { saldoProjetadoCents: projecao30.saldoProjetadoCents, negativo: projecao30.negativo },
            },
          }}
        />
      </div>
    </main>
  )
}
