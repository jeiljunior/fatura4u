import { NextRequest, NextResponse } from 'next/server'
import { marcarCobrancaManualComoRecebida, CriarCobrancaError } from '@/lib/faturamento/cobranca'
import { getEffectiveBusinessId } from '@/lib/getBusinessId'

async function getBusinessId() {
  return (await getEffectiveBusinessId())?.businessId ?? null
}

// Só pra cobranças "manuais" (PIX Avulso) — cobranças de gateway têm o
// status atualizado só pelo webhook, nunca manualmente, pra nunca divergir
// da verdade do provedor de pagamento.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const businessId = await getBusinessId()
  if (!businessId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { id } = await params
  const { status } = await req.json()

  if (status !== 'recebida') {
    return NextResponse.json({ error: 'Só é possível marcar como recebida' }, { status: 400 })
  }

  try {
    const charge = await marcarCobrancaManualComoRecebida(businessId, id)
    return NextResponse.json({ charge })
  } catch (e) {
    if (e instanceof CriarCobrancaError) return NextResponse.json({ error: e.message }, { status: e.status })
    const msg = e instanceof Error ? e.message : 'Erro ao marcar cobrança como recebida'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
