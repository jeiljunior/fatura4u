import { redirect } from 'next/navigation'
import supabaseAdmin from '@/lib/supabase/admin'
import { getEffectiveBusinessId } from '@/lib/getBusinessId'
import NotasClient from './NotasClient'

export default async function NotasPage() {
  const effective = await getEffectiveBusinessId()
  if (!effective) redirect('/login')

  const [{ data: invoices }, { data: customers }] = await Promise.all([
    supabaseAdmin.from('invoices').select('*, customers(name)').eq('business_id', effective.businessId).order('created_at', { ascending: false }),
    supabaseAdmin.from('customers').select('id, name, document').eq('business_id', effective.businessId).order('name'),
  ])

  return (
    <main className="min-h-screen">
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <h1 className="text-xl font-bold text-slate-900">Notas Fiscais</h1>
        <p className="text-slate-400 text-sm mt-0.5">Emissão de NFS-e Nacional</p>
      </div>
      <div className="p-6">
        <NotasClient initialInvoices={invoices ?? []} customers={customers ?? []} />
      </div>
    </main>
  )
}
