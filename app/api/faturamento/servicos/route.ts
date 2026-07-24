import { NextRequest, NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabase/admin'
import { getEffectiveBusinessId } from '@/lib/getBusinessId'

async function getBusinessId() {
  return (await getEffectiveBusinessId())?.businessId ?? null
}

export async function GET() {
  const businessId = await getBusinessId()
  if (!businessId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('servicos')
    .select('*')
    .eq('business_id', businessId)
    .order('nome')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ servicos: data })
}

export async function POST(req: NextRequest) {
  const businessId = await getBusinessId()
  if (!businessId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()
  const { id, nome } = body
  if (!nome) return NextResponse.json({ error: 'Nome do serviço é obrigatório' }, { status: 400 })

  const payload = {
    nome,
    descricao: body.descricao || null,
    preco_cents: body.preco_cents ?? null,
    codigo_servico: body.codigo_servico || null,
    aliquota_iss: body.aliquota_iss === '' || body.aliquota_iss == null ? null : body.aliquota_iss,
    ativo: body.ativo ?? true,
  }

  if (id) {
    const { data, error } = await supabaseAdmin.from('servicos')
      .update(payload)
      .eq('id', id).eq('business_id', businessId)
      .select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ servico: data })
  }

  const { data, error } = await supabaseAdmin.from('servicos')
    .insert({ business_id: businessId, ...payload })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ servico: data })
}

export async function DELETE(req: NextRequest) {
  const businessId = await getBusinessId()
  if (!businessId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { id } = await req.json()
  const { error } = await supabaseAdmin.from('servicos').delete().eq('id', id).eq('business_id', businessId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
