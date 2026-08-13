import { redirect } from 'next/navigation'
import Link from 'next/link'
import supabaseAdmin from '@/lib/supabase/admin'
import { getEffectiveBusinessId } from '@/lib/getBusinessId'
import { agruparPorData, ItemFuturo } from '@/lib/financeiro/timeline'

function fmt(cents: number) {
  return `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
}

function fmtData(dataISO: string | null) {
  if (!dataISO) return 'sem data'
  const [ano, mes, dia] = dataISO.split('-')
  return `${dia}/${mes}/${ano}`
}

export default async function FuturoPage() {
  const effective = await getEffectiveBusinessId()
  if (!effective) redirect('/login')
  const businessId = effective.businessId

  const [{ data: contasPagar }, { data: charges }] = await Promise.all([
    supabaseAdmin
      .from('contas_pagar')
      .select('id, descricao, valor_cents, due_date')
      .eq('business_id', businessId)
      .eq('status', 'pendente'),
    supabaseAdmin
      .from('charges')
      .select('id, valor_cents, due_date, customers(name)')
      .eq('business_id', businessId)
      .in('status', ['pendente', 'confirmada', 'vencida']),
  ])

  type ContaPagarRow = { id: string; descricao: string; valor_cents: number; due_date: string | null }
  type ChargeRow = { id: string; valor_cents: number; due_date: string | null; customers: { name: string } | { name: string }[] | null }

  const itens: ItemFuturo[] = [
    ...((contasPagar ?? []) as ContaPagarRow[]).map(c => ({
      id: `pagar-${c.id}`,
      tipo: 'pagar' as const,
      descricao: c.descricao,
      valorCents: c.valor_cents,
      dueDate: c.due_date,
    })),
    ...((charges ?? []) as ChargeRow[]).map(c => {
      const cliente = Array.isArray(c.customers) ? c.customers[0] : c.customers
      return {
        id: `receber-${c.id}`,
        tipo: 'receber' as const,
        descricao: cliente?.name ? `Cobrança · ${cliente.name}` : 'Cobrança',
        valorCents: c.valor_cents,
        dueDate: c.due_date,
      }
    }),
  ]

  const grupos = agruparPorData(itens)

  return (
    <main className="min-h-screen">
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <h1 className="text-xl font-bold text-slate-900">Futuro</h1>
        <p className="text-slate-400 text-sm mt-0.5">Contas a pagar e a receber, numa linha do tempo só</p>
      </div>

      <div className="p-6 max-w-3xl mx-auto space-y-8">
        {grupos.length === 0 && (
          <p className="text-slate-400 text-sm text-center py-12">Nenhuma conta pendente no momento.</p>
        )}

        {grupos.map(grupo => (
          <div key={grupo.label}>
            <h2 className="font-bold text-slate-900 mb-3">{grupo.label}</h2>
            <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
              {grupo.items.map(item => (
                <div key={item.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{item.descricao}</p>
                    <p className="text-slate-400 text-xs">{fmtData(item.dueDate)}</p>
                  </div>
                  <p className={`text-sm font-bold shrink-0 ${item.tipo === 'pagar' ? 'text-red-600' : 'text-emerald-600'}`}>
                    {item.tipo === 'pagar' ? '−' : '+'}{fmt(item.valorCents)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
