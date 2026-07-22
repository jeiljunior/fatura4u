import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import supabaseAdmin from '@/lib/supabase/admin'
import ConfiguracoesClient from './ConfiguracoesClient'

export default async function ConfiguracoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('business_id').eq('id', user.id).single()
  if (!profile?.business_id) redirect('/login')
  const businessId = profile.business_id as string

  const [{ data: business }, { data: config }, { data: certificado }, { data: gateways }] = await Promise.all([
    supabaseAdmin.from('businesses').select('*').eq('id', businessId).single(),
    supabaseAdmin.from('faturamento_config').select('*').eq('business_id', businessId).maybeSingle(),
    supabaseAdmin.from('certificados_digitais').select('valido_ate').eq('business_id', businessId).maybeSingle(),
    supabaseAdmin.from('gateway_credentials').select('provider, active').eq('business_id', businessId),
  ])

  return (
    <main className="min-h-screen">
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <h1 className="text-xl font-bold text-slate-900">Configurações</h1>
      </div>
      <div className="p-6 max-w-3xl">
        <ConfiguracoesClient
          business={business}
          config={config}
          certificado={certificado}
          gateways={gateways ?? []}
        />
      </div>
    </main>
  )
}
