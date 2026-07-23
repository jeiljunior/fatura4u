import { NextRequest, NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabase/admin'
import type { BillingType } from '@/lib/faturamento/types'
import { getEffectiveBusinessId } from '@/lib/getBusinessId'

const BILLING_TYPES: BillingType[] = ['pix', 'boleto', 'cartao']

async function getBusinessId() {
  return (await getEffectiveBusinessId())?.businessId ?? null
}

// Primeira ocorrência: se o dia de vencimento ainda não passou neste mês, usa
// este mês; senão, já agenda pro mês seguinte.
function proximaOcorrencia(diaVencimento: number): string {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = hoje.getMonth()
  const diaHoje = hoje.getDate()

  const [anoAlvo, mesAlvo] = diaHoje <= diaVencimento
    ? [ano, mes]
    : mes === 11 ? [ano + 1, 0] : [ano, mes + 1]

  return `${anoAlvo}-${String(mesAlvo + 1).padStart(2, '0')}-${String(diaVencimento).padStart(2, '0')}`
}

export async function GET() {
  const businessId = await getBusinessId()
  if (!businessId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: recorrentes, error } = await supabaseAdmin
    .from('recurring_charges')
    .select('*, customers(name)')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ recorrentes })
}

export async function POST(req: NextRequest) {
  const businessId = await getBusinessId()
  if (!businessId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()
  const { customerId, valueCents, billingType, description, dueDay } = body

  if (!customerId || !valueCents || !BILLING_TYPES.includes(billingType) || !dueDay || dueDay < 1 || dueDay > 28) {
    return NextResponse.json({ error: 'Dados da recorrência inválidos' }, { status: 400 })
  }

  const { data: recorrencia, error } = await supabaseAdmin
    .from('recurring_charges')
    .insert({
      business_id: businessId,
      customer_id: customerId,
      valor_cents: valueCents,
      billing_type: billingType,
      description: description || null,
      due_day: dueDay,
      next_due_date: proximaOcorrencia(dueDay),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ recorrencia })
}
