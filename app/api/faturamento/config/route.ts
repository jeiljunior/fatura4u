import { NextRequest, NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabase/admin'
import type { Ambiente, RegimeTributario } from '@/lib/faturamento/types'
import { getEffectiveBusinessId } from '@/lib/getBusinessId'

async function getBusinessId() {
  return (await getEffectiveBusinessId())?.businessId ?? null
}

export async function GET() {
  const businessId = await getBusinessId()
  if (!businessId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('faturamento_config')
    .select('*')
    .eq('business_id', businessId)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ config: data })
}

export async function PUT(req: NextRequest) {
  const businessId = await getBusinessId()
  if (!businessId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()

  const regimesValidos: RegimeTributario[] = ['mei', 'simples', 'normal']
  if (body.regime_tributario && !regimesValidos.includes(body.regime_tributario)) {
    return NextResponse.json({ error: 'Regime tributário inválido' }, { status: 400 })
  }

  const ambientesValidos: Ambiente[] = ['homologacao', 'producao']
  if (body.ambiente && !ambientesValidos.includes(body.ambiente)) {
    return NextResponse.json({ error: 'Ambiente inválido' }, { status: 400 })
  }

  const payload = {
    business_id: businessId,
    inscricao_municipal: body.inscricao_municipal ?? null,
    regime_tributario: body.regime_tributario ?? null,
    codigo_servico_padrao: body.codigo_servico_padrao ?? null,
    aliquota_iss_padrao: body.aliquota_iss_padrao ?? null,
    ambiente: body.ambiente ?? 'homologacao',
    municipio_ibge: body.municipio_ibge ?? null,
    serie_dps: body.serie_dps ?? '1',
    codigo_nbs: body.codigo_nbs ?? null,
    emissao_automatica: body.emissao_automatica ?? false,
    active: body.active ?? true,
  }

  const { data, error } = await supabaseAdmin
    .from('faturamento_config')
    .upsert(payload, { onConflict: 'business_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ config: data })
}
