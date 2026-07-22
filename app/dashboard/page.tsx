import { redirect } from 'next/navigation'
import Link from 'next/link'
import supabaseAdmin from '@/lib/supabase/admin'
import { getEffectiveBusinessId } from '@/lib/getBusinessId'

export default async function DashboardHome() {
  const effective = await getEffectiveBusinessId()
  if (!effective) redirect('/login')
  const businessId = effective.businessId

  const [{ count: totalClientes }, { count: cobrancasPendentes }, { count: notasEmitidas }] = await Promise.all([
    supabaseAdmin.from('customers').select('*', { count: 'exact', head: true }).eq('business_id', businessId),
    supabaseAdmin.from('charges').select('*', { count: 'exact', head: true }).eq('business_id', businessId).eq('status', 'pendente'),
    supabaseAdmin.from('invoices').select('*', { count: 'exact', head: true }).eq('business_id', businessId).eq('status', 'autorizada'),
  ])

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
      </div>
    </main>
  )
}
