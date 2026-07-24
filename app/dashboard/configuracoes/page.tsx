import { redirect } from 'next/navigation'
import supabaseAdmin from '@/lib/supabase/admin'
import { getEffectiveBusinessId } from '@/lib/getBusinessId'
import ConfiguracoesClient from './ConfiguracoesClient'

export default async function ConfiguracoesPage() {
  const effective = await getEffectiveBusinessId()
  if (!effective) redirect('/login')
  const businessId = effective.businessId

  const [{ data: business }, { data: config }, { data: certificado }, { data: gateways }, { data: whatsappConfig }, { data: servicos }] = await Promise.all([
    supabaseAdmin.from('businesses').select('*').eq('id', businessId).single(),
    supabaseAdmin.from('faturamento_config').select('*').eq('business_id', businessId).maybeSingle(),
    supabaseAdmin.from('certificados_digitais').select('valido_ate').eq('business_id', businessId).maybeSingle(),
    supabaseAdmin.from('gateway_credentials').select('provider, active').eq('business_id', businessId),
    supabaseAdmin.from('whatsapp_config').select('active').eq('business_id', businessId).maybeSingle(),
    supabaseAdmin.from('servicos').select('*').eq('business_id', businessId).order('nome'),
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
          whatsappConectado={whatsappConfig?.active ?? false}
          servicos={servicos ?? []}
        />
      </div>
    </main>
  )
}
