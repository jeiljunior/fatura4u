import { redirect } from 'next/navigation'
import supabaseAdmin from '@/lib/supabase/admin'
import { getEffectiveBusinessId } from '@/lib/getBusinessId'
import CobrancasClient from './CobrancasClient'
import RecorrentesClient from './RecorrentesClient'

export default async function CobrancasPage() {
  const effective = await getEffectiveBusinessId()
  if (!effective) redirect('/login')

  const [{ data: charges }, { data: customers }, { data: recorrentes }] = await Promise.all([
    supabaseAdmin.from('charges').select('*, customers(name)').eq('business_id', effective.businessId).order('created_at', { ascending: false }),
    supabaseAdmin.from('customers').select('id, name, document').eq('business_id', effective.businessId).order('name'),
    supabaseAdmin.from('recurring_charges').select('*, customers(name)').eq('business_id', effective.businessId).order('created_at', { ascending: false }),
  ])

  return (
    <main className="min-h-screen">
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <h1 className="text-xl font-bold text-slate-900">Cobranças</h1>
        <p className="text-slate-400 text-sm mt-0.5">PIX, boleto e cartão para seus clientes</p>
      </div>
      <div className="p-6">
        <RecorrentesClient initialRecorrentes={recorrentes ?? []} customers={customers ?? []} />
        <CobrancasClient initialCharges={charges ?? []} customers={customers ?? []} />
      </div>
    </main>
  )
}
