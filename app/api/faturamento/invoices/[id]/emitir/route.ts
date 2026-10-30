import { NextRequest, NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabase/admin'
import { emitirNotaFiscal, EmitirNotaFiscalError } from '@/lib/faturamento/nfse/emitir-nota'
import { getEffectiveBusinessId } from '@/lib/getBusinessId'

// Emite uma nota que está "a emitir" (veio de uma integração) ou foi rejeitada e será tentada de novo.
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const businessId = (await getEffectiveBusinessId())?.businessId ?? null
  if (!businessId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const { id } = await ctx.params

  const { data: inv } = await supabaseAdmin
    .from('invoices')
    .select('id, customer_id, status, valor_servicos, descricao_servico, origem')
    .eq('id', id)
    .eq('business_id', businessId)
    .maybeSingle()
  if (!inv) return NextResponse.json({ error: 'Nota não encontrada' }, { status: 404 })
  if (inv.status !== 'rascunho' && !(inv.status === 'rejeitada' && inv.origem)) {
    return NextResponse.json({ error: 'Esta nota não está pendente de emissão' }, { status: 400 })
  }
  if (!inv.descricao_servico) return NextResponse.json({ error: 'A nota não tem descrição do serviço' }, { status: 400 })

  try {
    const { invoice, adnResponse } = await emitirNotaFiscal({
      businessId,
      customerId: inv.customer_id,
      rascunhoId: inv.id,
      valorServicos: Number(inv.valor_servicos),
      descricaoServico: inv.descricao_servico,
    })
    return NextResponse.json({ invoice, adnResponse })
  } catch (e) {
    if (e instanceof EmitirNotaFiscalError) return NextResponse.json({ error: e.message }, { status: e.status })
    const msg = e instanceof Error ? e.message : 'Erro ao emitir nota fiscal'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
