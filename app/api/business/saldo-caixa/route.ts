import { NextRequest, NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabase/admin'
import { getEffectiveBusinessId } from '@/lib/getBusinessId'
import { buscarSaldoProjetado } from '@/lib/financeiro/saldoProjetado'

async function getBusinessId() {
  return (await getEffectiveBusinessId())?.businessId ?? null
}

export async function GET() {
  const businessId = await getBusinessId()
  if (!businessId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: business, error } = await supabaseAdmin
    .from('businesses')
    .select('saldo_caixa_cents')
    .eq('id', businessId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const saldoAtualCents = business.saldo_caixa_cents ?? 0
  const [projecao7, projecao15, projecao30] = await Promise.all([
    buscarSaldoProjetado(supabaseAdmin, businessId, saldoAtualCents, 7),
    buscarSaldoProjetado(supabaseAdmin, businessId, saldoAtualCents, 15),
    buscarSaldoProjetado(supabaseAdmin, businessId, saldoAtualCents, 30),
  ])

  return NextResponse.json({ saldoAtualCents, projecao7, projecao15, projecao30 })
}

export async function POST(req: NextRequest) {
  const businessId = await getBusinessId()
  if (!businessId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { saldoCaixaCents } = await req.json()
  if (typeof saldoCaixaCents !== 'number' || !Number.isInteger(saldoCaixaCents)) {
    return NextResponse.json({ error: 'saldoCaixaCents deve ser um número inteiro de centavos' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('businesses')
    .update({ saldo_caixa_cents: saldoCaixaCents })
    .eq('id', businessId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
