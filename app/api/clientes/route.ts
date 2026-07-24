import { NextRequest, NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabase/admin'
import { getEffectiveBusinessId } from '@/lib/getBusinessId'

export async function POST(req: NextRequest) {
  const businessId = (await getEffectiveBusinessId())?.businessId ?? null
  if (!businessId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()
  const { id, name } = body
  if (!name) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })

  const payload = {
    name,
    tipo_pessoa: body.tipo_pessoa === 'pj' ? 'pj' : 'pf',
    phone: body.phone || null,
    email: body.email || null,
    document: body.document || null,
    notes: body.notes || null,
    birth_date: body.birth_date || null,
    inscricao_estadual: body.inscricao_estadual || null,
    inscricao_municipal: body.inscricao_municipal || null,
    address_zip: body.address_zip || null,
    address_street: body.address_street || null,
    address_number: body.address_number || null,
    address_complement: body.address_complement || null,
    address_neighborhood: body.address_neighborhood || null,
    address_city: body.address_city || null,
    address_state: body.address_state || null,
  }

  if (id) {
    const { data, error } = await supabaseAdmin.from('customers')
      .update(payload)
      .eq('id', id).eq('business_id', businessId)
      .select('id').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, id: data.id })
  }

  const { data, error } = await supabaseAdmin.from('customers')
    .insert({ business_id: businessId, ...payload })
    .select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id })
}

export async function DELETE(req: NextRequest) {
  const businessId = (await getEffectiveBusinessId())?.businessId ?? null
  if (!businessId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { id } = await req.json()
  const { error } = await supabaseAdmin.from('customers').delete().eq('id', id).eq('business_id', businessId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
