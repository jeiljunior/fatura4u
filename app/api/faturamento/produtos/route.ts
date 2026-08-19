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
    .from('produtos')
    .select('*')
    .eq('business_id', businessId)
    .order('nome')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ produtos: data })
}

export async function POST(req: NextRequest) {
  const businessId = await getBusinessId()
  if (!businessId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()
  const { id, nome } = body
  if (!nome) return NextResponse.json({ error: 'Nome do produto é obrigatório' }, { status: 400 })

  const payload = {
    nome,
    codigo: body.codigo || null,
    descricao: body.descricao || null,
    embalagem: body.embalagem || null,
    fornecedor: body.fornecedor || null,
    preco_custo_cents: body.preco_custo_cents ?? null,
    preco_venda_cents: body.preco_venda_cents ?? null,
    ncm: body.ncm || null,
    cfop: body.cfop || null,
    unidade: body.unidade || 'UN',
    cest: body.cest || null,
    origem_mercadoria: body.origem_mercadoria || '0',
    icms_situacao_tributaria: body.icms_situacao_tributaria || null,
    aliquota_icms: body.aliquota_icms === '' || body.aliquota_icms == null ? null : body.aliquota_icms,
    ativo: body.ativo ?? true,
  }

  if (id) {
    const { data, error } = await supabaseAdmin.from('produtos')
      .update(payload)
      .eq('id', id).eq('business_id', businessId)
      .select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ produto: data })
  }

  const { data, error } = await supabaseAdmin.from('produtos')
    .insert({ business_id: businessId, ...payload })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ produto: data })
}

export async function DELETE(req: NextRequest) {
  const businessId = await getBusinessId()
  if (!businessId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { id } = await req.json()
  const { error } = await supabaseAdmin.from('produtos').delete().eq('id', id).eq('business_id', businessId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
