import { NextRequest, NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabase/admin'
import { getStoredCredentials } from '@/lib/faturamento/gateways'
import { mapAsaasWebhookStatus } from '@/lib/faturamento/gateways/asaas'
import { tentarEmitirNotaAutomatica } from '@/lib/faturamento/nfse/emitir-nota'

// Todos os tenants apontam o webhook Asaas deles pra essa mesma URL (cada um
// tem sua própria conta Asaas). Descobrimos de qual tenant é o evento pelo
// provider_charge_id já salvo em `charges`.
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { event, payment } = body
  const paymentId = payment?.id

  if (!paymentId) return NextResponse.json({ ok: true })

  const { data: charge } = await supabaseAdmin
    .from('charges')
    .select('id, business_id, billing_type, valor_cents')
    .eq('provider', 'asaas')
    .eq('provider_charge_id', paymentId)
    .maybeSingle()

  if (!charge) return NextResponse.json({ ok: true })

  // Autenticação: cada tenant configura, no próprio painel Asaas, um token de
  // autenticação de webhook — o Asaas reenvia esse valor no header abaixo.
  // Validamos contra o token cifrado guardado junto da credencial do tenant.
  const stored = await getStoredCredentials(charge.business_id, 'asaas')
  const receivedToken = req.headers.get('asaas-access-token')
  if (stored?.webhookToken && stored.webhookToken !== receivedToken) {
    return NextResponse.json({ error: 'Token de webhook inválido' }, { status: 401 })
  }

  if (!event?.startsWith('PAYMENT_')) return NextResponse.json({ ok: true })

  const status = mapAsaasWebhookStatus(payment.status)
  const update: Record<string, unknown> = { status }
  if (status === 'recebida' || status === 'confirmada') {
    update.paid_at = payment.paymentDate ?? new Date().toISOString()
  }

  await supabaseAdmin.from('charges').update(update).eq('id', charge.id)

  if (status === 'recebida' || status === 'confirmada') {
    await tentarEmitirNotaAutomatica(charge.business_id, charge.id)
  }

  return NextResponse.json({ ok: true })
}
