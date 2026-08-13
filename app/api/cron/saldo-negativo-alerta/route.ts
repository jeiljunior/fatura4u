import { NextRequest, NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabase/admin'
import { sendReminderEmail } from '@/lib/email'
import { buscarSaldoProjetado } from '@/lib/financeiro/saldoProjetado'
import { hojeBRT } from '@/lib/dateBrt'

function formatMoney(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// GET /api/cron/saldo-negativo-alerta — 1x/dia (vercel.json). Pra cada
// negócio cujo saldo projetado em 7 dias fica negativo, manda um e-mail de
// alerta pro dono — no máximo um por dia por negócio (dedupe via
// saldo_alerta_enviado_em), mesmo que o cron rode mais de uma vez.
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const hoje = hojeBRT()

  const { data: businesses } = await supabaseAdmin
    .from('businesses')
    .select('id, name, saldo_caixa_cents, saldo_alerta_enviado_em')

  let sent = 0

  for (const biz of businesses ?? []) {
    if (biz.saldo_alerta_enviado_em === hoje) continue

    const saldoAtualCents = biz.saldo_caixa_cents ?? 0
    const projecao = await buscarSaldoProjetado(supabaseAdmin, biz.id, saldoAtualCents, 7)
    if (!projecao.negativo) continue

    const { data: ownerProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('business_id', biz.id)
      .eq('role', 'owner')
      .limit(1)
      .maybeSingle()
    if (!ownerProfile) continue

    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(ownerProfile.id)
    const email = userData?.user?.email
    if (!email) continue

    const html = `
      <p>Olá, ${biz.name}!</p>
      <p>De acordo com o saldo em caixa e as contas a pagar/receber pendentes, seu saldo projetado fica <strong>negativo</strong> nos próximos 7 dias.</p>
      <p>Saldo em caixa atual: <strong>${formatMoney(saldoAtualCents)}</strong><br/>
      Saldo projetado em 7 dias: <strong>${formatMoney(projecao.saldoProjetadoCents)}</strong></p>
      <p>Vale dar uma olhada no Financeiro pra ver o que pode ser adiado ou antecipado.</p>
    `

    const ok = await sendReminderEmail(email, '⚠️ Seu saldo projetado fica negativo nos próximos 7 dias', html)
    if (ok) {
      await supabaseAdmin.from('businesses').update({ saldo_alerta_enviado_em: hoje }).eq('id', biz.id)
      sent++
    }
  }

  return NextResponse.json({ ok: true, sent })
}
