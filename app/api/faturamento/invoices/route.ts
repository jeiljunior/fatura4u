import { NextRequest, NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabase/admin'
import { emitirNotaFiscal, EmitirNotaFiscalError } from '@/lib/faturamento/nfse/emitir-nota'
import { getEffectiveBusinessId } from '@/lib/getBusinessId'

async function getBusinessId() {
  return (await getEffectiveBusinessId())?.businessId ?? null
}

export async function GET() {
  const businessId = await getBusinessId()
  if (!businessId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('invoices')
    .select('*, customers(name)')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ invoices: data })
}

export async function POST(req: NextRequest) {
  const businessId = await getBusinessId()
  if (!businessId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()
  const { customerId, chargeId, servicoId, valorServicos, descricaoServico } = body

  if (!customerId || !valorServicos || !descricaoServico) {
    return NextResponse.json({ error: 'Cliente, valor e descrição do serviço são obrigatórios' }, { status: 400 })
  }

  try {
    const { invoice, adnResponse } = await emitirNotaFiscal({
      businessId,
      customerId,
      chargeId,
      servicoId,
      valorServicos,
      descricaoServico,
    })
    return NextResponse.json({ invoice, adnResponse })
  } catch (e) {
    if (e instanceof EmitirNotaFiscalError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    const msg = e instanceof Error ? e.message : 'Erro ao emitir nota fiscal'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
