import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import supabaseAdmin from '@/lib/supabase/admin'
import ClientesClient from './ClientesClient'

export default async function ClientesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('business_id').eq('id', user.id).single()
  if (!profile?.business_id) redirect('/login')

  const { data: customers } = await supabaseAdmin
    .from('customers')
    .select('id, name, phone, email, document, notes')
    .eq('business_id', profile.business_id)
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
