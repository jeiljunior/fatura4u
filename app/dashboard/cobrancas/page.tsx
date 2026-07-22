import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import supabaseAdmin from '@/lib/supabase/admin'
import CobrancasClient from './CobrancasClient'

export default async function CobrancasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('business_id').eq('id', user.id).single()
  if (!profile?.business_id) redirect('/login')

  const [{ data: charges }, { data: customers }] = await Promise.all([
    supabaseAdmin.from('charges').select('*, customers(name)').eq('business_id', profile.business_id).order('created_at', { ascending: false }),
    supabaseAdmin.from('customers').select('id, name, document').eq('business_id', profile.business_id).order('name'),
  ])

  return (
    <main className="min-h-screen">
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <h1 className="text-xl font-bold text-slate-900">Cobranças</h1>
        <p className="text-slate-400 text-sm mt-0.5">PIX, boleto e cartão para seus clientes</p>
      </div>
      <div className="p-6">
        <CobrancasClient initialCharges={charges ?? []} customers={customers ?? []} />
      </div>
    </main>
  )
}
