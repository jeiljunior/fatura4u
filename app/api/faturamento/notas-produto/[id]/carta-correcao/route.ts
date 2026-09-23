import { NextRequest, NextResponse } from 'next/server'
import { emitirCartaCorrecaoNotaProduto, EmitirNotaProdutoError } from '@/lib/faturamento/nfe/emitir-nota'
import { getEffectiveBusinessId } from '@/lib/getBusinessId'

async function getBusinessId() {
  return (await getEffectiveBusinessId())?.businessId ?? null
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const businessId = await getBusinessId()
  if (!businessId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { id } = await params
  const { correcao } = await req.json()

  if (!correcao || correcao.trim().length < 15 || correcao.trim().length > 1000) {
    return NextResponse.json({ error: 'A correção precisa ter entre 15 e 1000 caracteres' }, { status: 400 })
  }

  try {
    const { carta, sefazResponse } = await emitirCartaCorrecaoNotaProduto({ businessId, notaId: id, correcao })
    return NextResponse.json({ carta, sefazResponse })
  } catch (e) {
    if (e instanceof EmitirNotaProdutoError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    const msg = e instanceof Error ? e.message : 'Erro ao registrar carta de correção'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
