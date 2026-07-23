// Criação de uma cobrança real no gateway — usado tanto pela rota manual
// (POST /api/faturamento/charges) quanto pelo motor de recorrência
// (lib/faturamento/recorrencia.ts), pra nunca duas implementações divergirem.
import supabaseAdmin from '@/lib/supabase/admin'
import { getGatewayForBusiness } from '@/lib/faturamento/gateways'
import type { BillingType, Charge } from '@/lib/faturamento/types'

export class CriarCobrancaError extends Error {
  constructor(message: string, public status: number) {
    super(message)
  }
}

export type CriarCobrancaParams = {
  businessId: string
  customerId: string
  valueCents: number
  billingType: BillingType
  dueDate?: string
  description?: string
  recurringChargeId?: string
}

export async function criarCobranca(params: CriarCobrancaParams): Promise<Charge> {
  const gw = await getGatewayForBusiness(params.businessId)
  if (!gw) throw new CriarCobrancaError('Nenhum gateway de pagamento conectado', 400)

  const { data: customer } = await supabaseAdmin
    .from('customers')
    .select('id, name, document, email, phone')
    .eq('id', params.customerId)
    .eq('business_id', params.businessId)
    .single()

  if (!customer) throw new CriarCobrancaError('Cliente não encontrado', 404)

  // Reaproveita o customer já criado no gateway, se existir
  let providerCustomerId: string
  const { data: link } = await supabaseAdmin
    .from('gateway_customers')
    .select('provider_customer_id')
    .eq('customer_id', params.customerId)
    .eq('provider', gw.provider)
    .maybeSingle()

  if (link) {
    providerCustomerId = link.provider_customer_id
  } else {
    if (!customer.document) {
      throw new CriarCobrancaError('Cliente precisa ter CPF/CNPJ cadastrado pra cobrar', 400)
    }
    const created = await gw.gateway.createCustomer({
      name: customer.name,
      document: customer.document,
      email: customer.email ?? undefined,
      phone: customer.phone ?? undefined,
    })
    providerCustomerId = created.id
    await supabaseAdmin.from('gateway_customers').insert({
      business_id: params.businessId,
      customer_id: params.customerId,
      provider: gw.provider,
      provider_customer_id: providerCustomerId,
    })
  }

  const result = await gw.gateway.createCharge({
    providerCustomerId,
    valueCents: params.valueCents,
    billingType: params.billingType,
    dueDate: params.dueDate,
    description: params.description,
    payerName: customer.name,
    payerDocument: customer.document ?? undefined,
    payerEmail: customer.email ?? undefined,
  })

  const { data: charge, error } = await supabaseAdmin
    .from('charges')
    .insert({
      business_id: params.businessId,
      customer_id: params.customerId,
      provider: gw.provider,
      provider_charge_id: result.id,
      valor_cents: params.valueCents,
      billing_type: params.billingType,
      status: result.status,
      due_date: params.dueDate ?? null,
      pix_qr_code: result.pixQrCode ?? null,
      pix_payload: result.pixPayload ?? null,
      boleto_url: result.boletoUrl ?? null,
      payment_link: result.paymentLink ?? null,
      recurring_charge_id: params.recurringChargeId ?? null,
    })
    .select()
    .single()

  if (error) throw new CriarCobrancaError(error.message, 500)
  return charge as Charge
}
