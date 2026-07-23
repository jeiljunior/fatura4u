import { redirect } from 'next/navigation'
import supabaseAdmin from '@/lib/supabase/admin'
import { getEffectiveBusinessId } from '@/lib/getBusinessId'
import ContasPagarClient from './ContasPagarClient'

export default async function ContasPagarPage() {
  const effective = await getEffectiveBusinessId()
  if (!effective) redirect('/login')

  const { data: contas } = await supabaseAdmin
    .from('contas_pagar')
    .select('*')
    .eq('business_id', effective.businessId)
    .order('due_date', { ascending: true })

  return (
    <main className="min-h-screen">
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <h1 className="text-xl font-bold text-slate-900">Contas a pagar</h1>
        <p className="text-slate-400 text-sm mt-0.5">Suas próprias despesas — aluguel, fornecedores, impostos</p>
      </div>
      <div className="p-6">
        <ContasPagarClient initialContas={contas ?? []} />
      </div>
    </main>
  )
}
