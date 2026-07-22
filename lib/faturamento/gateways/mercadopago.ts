// Adapter Mercado Pago do módulo Faturamento — usa o access_token do PRÓPRIO
// TENANT (conta Mercado Pago dele, conectada em gateway_credentials).
import type {
  PaymentGateway,
  GatewayCustomerParams,
  GatewayChargeParams,
  GatewayChargeResult,
  ChargeStatus,
  BillingType,
} from '@/lib/faturamento/types'

const MP_BASE = 'https://api.mercadopago.com'

const BILLING_TYPE_TO_MP: Record<BillingType, string> = {
  pix: 'pix',
  boleto: 'bolbradesco',
  cartao: 'credit_card',
}

// Status do Mercado Pago: pending/in_process/authorized (aguardando),
// approved (pago), cancelled/rejected/refunded/charged_back (encerrado sem sucesso)
const MP_STATUS_TO_CHARGE_STATUS: Record<string, ChargeStatus> = {
  pending: 'pendente',
  in_process: 'pendente',
  authorized: 'pendente',
  approved: 'recebida',
  cancelled: 'cancelada',
  rejected: 'cancelada',
  refunded: 'cancelada',
  charged_back: 'cancelada',
}

function mapStatus(mpStatus: string): ChargeStatus {
  return MP_STATUS_TO_CHARGE_STATUS[mpStatus] ?? 'pendente'
}

async function mpRequest(accessToken: string, path: string, method = 'GET', body?: object) {
  const res = await fetch(`${MP_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  let data: Record<string, unknown> = {}
  try { data = text ? JSON.parse(text) : {} } catch { /* resposta não-JSON */ }

  if (!res.ok) {
    const msg = (data?.message as string)
      ?? (data?.cause as Array<{ description: string }>)?.[0]?.description
      ?? `Mercado Pago error ${res.status}`
    throw new Error(msg)
  }
  return data
}

function splitName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/)
  const first = parts[0] ?? fullName
  const last = parts.slice(1).join(' ') || first
  return { first, last }
}

export function createMercadoPagoGateway(accessToken: string): PaymentGateway {
  return {
    async createCustomer(params: GatewayCustomerParams) {
      const { first, last } = splitName(params.name)
      const doc = params.document.replace(/\D/g, '')
      const data = await mpRequest(accessToken, '/v1/customers', 'POST', {
        email: params.email,
        first_name: first,
        last_name: last,
        identification: { type: doc.length > 11 ? 'CNPJ' : 'CPF', number: doc },
      })
      return { id: data.id as string }
    },

    async createCharge(params: GatewayChargeParams): Promise<GatewayChargeResult> {
      const doc = params.payerDocument?.replace(/\D/g, '')
      const { first, last } = splitName(params.payerName ?? 'Cliente')

      const data = await mpRequest(accessToken, '/v1/payments', 'POST', {
        transaction_amount: params.valueCents / 100,
        payment_method_id: BILLING_TYPE_TO_MP[params.billingType],
        description: params.description,
        date_of_expiration: params.dueDate ? new Date(`${params.dueDate}T23:59:59-03:00`).toISOString() : undefined,
        payer: {
          email: params.payerEmail,
          first_name: first,
          last_name: last,
          identification: doc ? { type: doc.length > 11 ? 'CNPJ' : 'CPF', number: doc } : undefined,
        },
      })

      const result: GatewayChargeResult = {
        id: String(data.id),
        status: mapStatus(data.status as string),
      }

      const pointOfInteraction = data.point_of_interaction as { transaction_data?: { qr_code?: string; qr_code_base64?: string } } | undefined
      if (params.billingType === 'pix' && pointOfInteraction?.transaction_data) {
        result.pixPayload = pointOfInteraction.transaction_data.qr_code
        result.pixQrCode = pointOfInteraction.transaction_data.qr_code_base64
      }

      if (params.billingType === 'boleto') {
        const td = data.transaction_details as { external_resource_url?: string } | undefined
        result.boletoUrl = td?.external_resource_url
      }

      return result
    },

    async cancelCharge(providerChargeId: string) {
      await mpRequest(accessToken, `/v1/payments/${providerChargeId}`, 'PUT', { status: 'cancelled' })
    },
  }
}

// Usado pelo webhook: o Mercado Pago manda só o ID no payload da notificação,
// então buscamos o pagamento completo pra saber o status real.
export async function buscarPagamentoMercadoPago(accessToken: string, paymentId: string) {
  return mpRequest(accessToken, `/v1/payments/${paymentId}`)
}

export function mapMercadoPagoStatus(mpStatus: string): ChargeStatus {
  return mapStatus(mpStatus)
}
