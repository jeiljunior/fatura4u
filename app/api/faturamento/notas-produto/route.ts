import { NextRequest, NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabase/admin'
import { emitirNotaProduto, EmitirNotaProdutoError } from '@/lib/faturamento/nfe/emitir-nota'
import { getEffectiveBusinessId } from '@/lib/getBusinessId'

async function getBusinessId() {
  return (await getEffectiveBusinessId())?.businessId ?? null
}

export async function GET() {
  const businessId = await getBusinessId()
  if (!businessId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('notas_produto')
    .select('*, customers(name)')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ notas: data })
}

export async function POST(req: NextRequest) {
  const businessId = await getBusinessId()
  if (!businessId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()
  const { customerId, chargeId, modelo, itens, destinatario, naturezaOperacao } = body

  if (modelo !== '55' && modelo !== '65') {
    return NextResponse.json({ error: 'Modelo inválido — use 55 (NF-e) ou 65 (NFC-e)' }, { status: 400 })
  }
  if (!Array.isArray(itens) || itens.length === 0) {
    return NextResponse.json({ error: 'Informe pelo menos um item' }, { status: 400 })
  }

  try {
    const { nota, sefazResponse } = await emitirNotaProduto({
      businessId,
      modelo,
      customerId: customerId || null,
      chargeId: chargeId || null,
      itens,
      destinatario: destinatario || null,
      naturezaOperacao,
    })
    return NextResponse.json({ nota, sefazResponse })
  } catch (e) {
    if (e instanceof EmitirNotaProdutoError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    const msg = e instanceof Error ? e.message : 'Erro ao emitir nota de produto'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
