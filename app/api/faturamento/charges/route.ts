import { NextRequest, NextResponse } from 'next/server'
import supabaseAdmin from '@/lib/supabase/admin'
import { criarCobranca, CriarCobrancaError } from '@/lib/faturamento/cobranca'
import type { BillingType } from '@/lib/faturamento/types'
import { getEffectiveBusinessId } from '@/lib/getBusinessId'

const BILLING_TYPES: BillingType[] = ['pix', 'boleto', 'cartao']

async function getBusinessId() {
  return (await getEffectiveBusinessId())?.businessId ?? null
}

export async function GET() {
  const businessId = await getBusinessId()
  if (!businessId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const [{ data: charges, error }, { data: customers }] = await Promise.all([
    supabaseAdmin
      .from('charges')
      .select('*, customers(name)')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('customers')
      .select('id, name, document')
      .eq('business_id', businessId)
      .order('name'),
  ])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ charges, customers })
}

export async function POST(req: NextRequest) {
  const businessId = await getBusinessId()
  if (!businessId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()
  const { customerId, valueCents, billingType, dueDate, description, servicoId } = body

  if (!customerId || !valueCents || !BILLING_TYPES.includes(billingType)) {
    return NextResponse.json({ error: 'Dados da cobrança inválidos' }, { status: 400 })
  }

  try {
    const charge = await criarCobranca({ businessId, customerId, valueCents, billingType, dueDate, description, servicoId })
    return NextResponse.json({ charge })
  } catch (e) {
    if (e instanceof CriarCobrancaError) return NextResponse.json({ error: e.message }, { status: e.status })
    const msg = e instanceof Error ? e.message : 'Erro ao criar cobrança'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
