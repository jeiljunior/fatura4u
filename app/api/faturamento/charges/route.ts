import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import supabaseAdmin from '@/lib/supabase/admin'
import { getGatewayForBusiness } from '@/lib/faturamento/gateways'
import type { BillingType } from '@/lib/faturamento/types'

const BILLING_TYPES: BillingType[] = ['pix', 'boleto', 'cartao']

async function getBusinessId() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('business_id')
    .eq('id', user.id)
    .single()

  return profile?.business_id ?? null
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
  const { customerId, valueCents, billingType, dueDate, description } = body

  if (!customerId || !valueCents || !BILLING_TYPES.includes(billingType)) {
    return NextResponse.json({ error: 'Dados da cobrança inválidos' }, { status: 400 })
  }

  const gw = await getGatewayForBusiness(businessId)
  if (!gw) return NextResponse.json({ error: 'Nenhum gateway de pagamento conectado' }, { status: 400 })

  const { data: customer } = await supabaseAdmin
    .from('customers')
    .select('id, name, document, email, phone')
    .eq('id', customerId)
    .eq('business_id', businessId)
    .single()

  if (!customer) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })

  try {
    // Reaproveita o customer já criado no gateway, se existir
    let providerCustomerId: string
    const { data: link } = await supabaseAdmin
      .from('gateway_customers')
      .select('provider_customer_id')
      .eq('customer_id', customerId)
      .eq('provider', gw.provider)
      .maybeSingle()

    if (link) {
      providerCustomerId = link.provider_customer_id
    } else {
      if (!customer.document) {
        return NextResponse.json({ error: 'Cliente precisa ter CPF/CNPJ cadastrado pra cobrar' }, { status: 400 })
      }
      const created = await gw.gateway.createCustomer({
        name: customer.name,
        document: customer.document,
        email: customer.email ?? undefined,
        phone: customer.phone ?? undefined,
      })
      providerCustomerId = created.id
      await supabaseAdmin.from('gateway_customers').insert({
        business_id: businessId,
        customer_id: customerId,
        provider: gw.provider,
        provider_customer_id: providerCustomerId,
      })
    }

    const result = await gw.gateway.createCharge({
      providerCustomerId,
      valueCents,
      billingType,
      dueDate,
      description,
      payerName: customer.name,
      payerDocument: customer.document ?? undefined,
      payerEmail: customer.email ?? undefined,
    })

    const { data: charge, error } = await supabaseAdmin
      .from('charges')
      .insert({
        business_id: businessId,
        customer_id: customerId,
        provider: gw.provider,
        provider_charge_id: result.id,
        valor_cents: valueCents,
        billing_type: billingType,
        status: result.status,
        due_date: dueDate ?? null,
        pix_qr_code: result.pixQrCode ?? null,
        pix_payload: result.pixPayload ?? null,
        boleto_url: result.boletoUrl ?? null,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ charge })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao criar cobrança'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
