import { NextRequest, NextResponse } from 'next/server'
import { cancelarNotaProduto, EmitirNotaProdutoError } from '@/lib/faturamento/nfe/emitir-nota'
import { getEffectiveBusinessId } from '@/lib/getBusinessId'

async function getBusinessId() {
  return (await getEffectiveBusinessId())?.businessId ?? null
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const businessId = await getBusinessId()
  if (!businessId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { id } = await params
  const { justificativa } = await req.json()

  if (!justificativa || justificativa.trim().length < 15) {
    return NextResponse.json({ error: 'Justificativa precisa ter pelo menos 15 caracteres' }, { status: 400 })
  }

  try {
    const { nota, sefazResponse } = await cancelarNotaProduto({ businessId, notaId: id, justificativa })
    return NextResponse.json({ nota, sefazResponse })
  } catch (e) {
    if (e instanceof EmitirNotaProdutoError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    const msg = e instanceof Error ? e.message : 'Erro ao cancelar nota de produto'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
