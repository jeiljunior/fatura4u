import { NextRequest, NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabase/admin'
import { encryptJSON } from '@/lib/faturamento/crypto'
import type { GatewayProvider } from '@/lib/faturamento/types'
import { getEffectiveBusinessId } from '@/lib/getBusinessId'

const PROVIDERS: GatewayProvider[] = ['asaas', 'stripe', 'pagarme', 'mercadopago']

async function getBusinessId() {
  return (await getEffectiveBusinessId())?.businessId ?? null
}

// GET — status das conexões do tenant, sem nunca expor a credencial cifrada
export async function GET() {
  const businessId = await getBusinessId()
  if (!businessId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('gateway_credentials')
    .select('provider, active, created_at, updated_at')
    .eq('business_id', businessId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ connections: data })
}

// POST — conecta (ou reconecta) um gateway, cifrando a credencial antes de salvar
export async function POST(req: NextRequest) {
  const businessId = await getBusinessId()
  if (!businessId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()
  const { provider, apiKey, webhookToken } = body

  if (!PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: 'Gateway inválido' }, { status: 400 })
  }
  if (!apiKey || typeof apiKey !== 'string') {
    return NextResponse.json({ error: 'Chave de API é obrigatória' }, { status: 400 })
  }

  const enc = encryptJSON({ apiKey, webhookToken: webhookToken || undefined })

  const { error } = await supabaseAdmin
    .from('gateway_credentials')
    .upsert({
      business_id: businessId,
      provider,
      credentials: { enc },
      active: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'business_id,provider' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

// DELETE — desconecta um gateway (?provider=asaas)
export async function DELETE(req: NextRequest) {
  const businessId = await getBusinessId()
  if (!businessId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const provider = req.nextUrl.searchParams.get('provider')
  if (!provider || !PROVIDERS.includes(provider as GatewayProvider)) {
    return NextResponse.json({ error: 'Gateway inválido' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('gateway_credentials')
    .delete()
    .eq('business_id', businessId)
    .eq('provider', provider)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
