import { NextRequest, NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabase/admin'
import { getEffectiveBusinessId } from '@/lib/getBusinessId'

async function getBusinessId() {
  return (await getEffectiveBusinessId())?.businessId ?? null
}

export async function GET() {
  const businessId = await getBusinessId()
  if (!businessId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: modelos, error } = await supabaseAdmin
    .from('contas_pagar_modelos')
    .select('*')
    .eq('business_id', businessId)
    .order('descricao')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ modelos })
}

export async function POST(req: NextRequest) {
  const businessId = await getBusinessId()
  if (!businessId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()
  const { descricao, categoria, valueCents } = body

  if (!descricao) {
    return NextResponse.json({ error: 'Descrição é obrigatória' }, { status: 400 })
  }

  const { data: modelo, error } = await supabaseAdmin
    .from('contas_pagar_modelos')
    .insert({
      business_id: businessId,
      descricao,
      categoria: categoria || null,
      valor_cents: valueCents || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ modelo })
}
