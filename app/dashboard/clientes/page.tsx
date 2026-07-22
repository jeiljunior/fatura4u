import { redirect } from 'next/navigation'
import supabaseAdmin from '@/lib/supabase/admin'
import { getEffectiveBusinessId } from '@/lib/getBusinessId'
import ClientesClient from './ClientesClient'

export default async function ClientesPage() {
  const effective = await getEffectiveBusinessId()
  if (!effective) redirect('/login')

  const { data: customers } = await supabaseAdmin
    .from('customers')
    .select('id, name, phone, email, document, notes')
    .eq('business_id', effective.businessId)
    .order('name')

  return (
    <main className="min-h-screen">
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <h1 className="text-xl font-bold text-slate-900">Clientes</h1>
        <p className="text-slate-400 text-sm mt-0.5">Pessoas/empresas para quem você emite nota e cobra</p>
      </div>
      <div className="p-6">
        <ClientesClient initialCustomers={customers ?? []} />
      </div>
    </main>
  )
}
