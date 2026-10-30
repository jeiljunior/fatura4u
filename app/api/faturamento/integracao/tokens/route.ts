import { NextRequest, NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabase/admin'
import { getEffectiveBusinessId } from '@/lib/getBusinessId'
import { novaChave } from '@/lib/integracao/tokens'

// Chaves de integração da empresa: listar, criar (a chave aparece só nesta resposta) e revogar.
export async function GET() {
  const businessId = (await getEffectiveBusinessId())?.businessId ?? null
  if (!businessId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const { data, error } = await supabaseAdmin
    .from('integration_tokens')
    .select('id, name, active, last_used_at, created_at')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tokens: data })
}

export async function POST(req: NextRequest) {
  const businessId = (await getEffectiveBusinessId())?.businessId ?? null
  if (!businessId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const name = String(body?.name ?? '').trim().slice(0, 60)
  if (!name) return NextResponse.json({ error: 'Dê um nome à chave (ex.: SIGN4U)' }, { status: 400 })

  const { count } = await supabaseAdmin.from('integration_tokens').select('id', { count: 'exact', head: true }).eq('business_id', businessId).eq('active', true)
  if ((count ?? 0) >= 10) return NextResponse.json({ error: 'Limite de 10 chaves ativas. Revogue alguma antes.' }, { status: 400 })

  const { chave, hash } = novaChave()
  const { error } = await supabaseAdmin.from('integration_tokens').insert({ business_id: businessId, name, token_hash: hash })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, chave })
}

export async function DELETE(req: NextRequest) {
  const businessId = (await getEffectiveBusinessId())?.businessId ?? null
  if (!businessId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const { id } = await req.json().catch(() => ({}))
  if (!id) return NextResponse.json({ error: 'Chave não informada' }, { status: 400 })
  const { error } = await supabaseAdmin.from('integration_tokens').update({ active: false }).eq('id', id).eq('business_id', businessId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
