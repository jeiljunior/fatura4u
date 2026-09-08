import { NextRequest, NextResponse } from 'next/server'
import { cancelarNotaFiscal, EmitirNotaFiscalError } from '@/lib/faturamento/nfse/emitir-nota'
import type { MotivoCancelamento } from '@/lib/faturamento/nfse/cancelar'
import { getEffectiveBusinessId } from '@/lib/getBusinessId'

async function getBusinessId() {
  return (await getEffectiveBusinessId())?.businessId ?? null
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const businessId = await getBusinessId()
  if (!businessId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { motivo, justificativa } = body

  const motivosValidos: MotivoCancelamento[] = ['1', '2', '9']
  if (!motivosValidos.includes(motivo)) {
    return NextResponse.json({ error: 'Motivo inválido — use 1 (erro na emissão), 2 (serviço não prestado) ou 9 (outros)' }, { status: 400 })
  }
  if (!justificativa || justificativa.trim().length < 15) {
    return NextResponse.json({ error: 'Justificativa precisa ter pelo menos 15 caracteres' }, { status: 400 })
  }

  try {
    const { invoice, sefazResponse } = await cancelarNotaFiscal({
      businessId,
      invoiceId: id,
      motivo,
      justificativa,
    })
    return NextResponse.json({ invoice, sefazResponse })
  } catch (e) {
    if (e instanceof EmitirNotaFiscalError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    const msg = e instanceof Error ? e.message : 'Erro ao cancelar nota fiscal'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
