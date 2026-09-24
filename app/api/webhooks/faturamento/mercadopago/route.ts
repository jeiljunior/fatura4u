import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabase/admin'
import { getStoredCredentials } from '@/lib/faturamento/gateways'
import { buscarPagamentoMercadoPago, mapMercadoPagoStatus } from '@/lib/faturamento/gateways/mercadopago'
import { tentarEmitirNotaAutomatica } from '@/lib/faturamento/nfse/emitir-nota'

// Todos os tenants apontam o webhook Mercado Pago deles pra essa mesma URL
// (cada um com sua própria aplicação/conta MP) — mesmo padrão do webhook
// Asaas. Descobrimos de qual tenant é o evento pelo provider_charge_id já
// salvo em `charges`.
//
// Validação de assinatura conforme doc oficial ("Webhooks" > "Validar
// origem da notificação", sem SDK): manifest = "id:{data.id};request-id:
// {x-request-id};ts:{ts};", HMAC-SHA256 desse manifest com o secret da
// aplicação, comparado ao valor "v1" do header x-signature.
function validarAssinatura(req: NextRequest, dataId: string, secret: string): boolean {
  const xSignature = req.headers.get('x-signature')
  const xRequestId = req.headers.get('x-request-id') ?? ''
  if (!xSignature) return false

  const parts = Object.fromEntries(
    xSignature.split(',').map(p => p.trim().split('=').map(s => s.trim())) as [string, string][]
  )
  const ts = parts.ts
  const v1 = parts.v1
  if (!ts || !v1) return false

  const manifest = `id:${dataId.toLowerCase()};request-id:${xRequestId};ts:${ts};`
  const hmac = Buffer.from(crypto.createHmac('sha256', secret).update(manifest).digest('hex'))
  const received = Buffer.from(v1)

  return hmac.length === received.length && crypto.timingSafeEqual(hmac, received)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const type = body.type ?? req.nextUrl.searchParams.get('type')
  const dataId = (body.data?.id ?? req.nextUrl.searchParams.get('data.id'))?.toString()

  if (type !== 'payment' || !dataId) return NextResponse.json({ ok: true })

  const { data: charge } = await supabaseAdmin
    .from('charges')
    .select('id, business_id')
    .eq('provider', 'mercadopago')
    .eq('provider_charge_id', dataId)
    .maybeSingle()

  if (!charge) return NextResponse.json({ ok: true })

  const stored = await getStoredCredentials(charge.business_id, 'mercadopago')
  if (!stored) return NextResponse.json({ ok: true })

  // A assinatura secreta é opcional só até o tenant configurar (mesmo
  // comportamento tolerante do webhook Asaas) — mas se ele já cadastrou uma,
  // validamos de verdade.
  if (stored.webhookToken && !validarAssinatura(req, dataId, stored.webhookToken)) {
    return NextResponse.json({ error: 'Assinatura de webhook inválida' }, { status: 401 })
  }

  // O corpo da notificação não traz o status — precisa buscar o pagamento
  // completo na API do Mercado Pago.
  const payment = await buscarPagamentoMercadoPago(stored.apiKey, dataId)
  const status = mapMercadoPagoStatus(payment.status as string)

  const update: Record<string, unknown> = { status }
  if (status === 'recebida' || status === 'confirmada') {
    update.paid_at = (payment.date_approved as string) ?? new Date().toISOString()
  }

  await supabaseAdmin.from('charges').update(update).eq('id', charge.id)

  if (status === 'recebida' || status === 'confirmada') {
    await tentarEmitirNotaAutomatica(charge.business_id, charge.id)
  }

  return NextResponse.json({ ok: true })
}
