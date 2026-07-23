// Adapter Asaas do módulo Faturamento — usa a API key do PRÓPRIO TENANT
// (a conta Asaas que ele mesmo conectou em Configurações).
import type {
  PaymentGateway,
  GatewayCustomerParams,
  GatewayChargeParams,
  GatewayChargeResult,
  ChargeStatus,
  BillingType,
} from '@/lib/faturamento/types'

const ASAAS_BASE = 'https://api.asaas.com/v3'

const BILLING_TYPE_TO_ASAAS: Record<BillingType, string> = {
  pix: 'PIX',
  boleto: 'BOLETO',
  cartao: 'CREDIT_CARD',
}

const ASAAS_STATUS_TO_CHARGE_STATUS: Record<string, ChargeStatus> = {
  PENDING: 'pendente',
  AWAITING_RISK_ANALYSIS: 'pendente',
  CONFIRMED: 'confirmada',
  RECEIVED: 'recebida',
  RECEIVED_IN_CASH: 'recebida',
  OVERDUE: 'vencida',
  REFUNDED: 'cancelada',
  DELETED: 'cancelada',
}

function mapStatus(asaasStatus: string): ChargeStatus {
  return ASAAS_STATUS_TO_CHARGE_STATUS[asaasStatus] ?? 'pendente'
}

async function asaasRequest(apiKey: string, path: string, method = 'GET', body?: object) {
  const res = await fetch(`${ASAAS_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'access_token': apiKey,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  let data: Record<string, unknown> = {}
  try { data = text ? JSON.parse(text) : {} } catch { /* resposta não-JSON */ }

  if (!res.ok) {
    const msg = (data?.errors as Array<{ description: string }>)?.[0]?.description
      ?? (data?.message as string)
      ?? `Asaas error ${res.status}`
    throw new Error(msg)
  }
  return data
}

export function createAsaasGateway(apiKey: string): PaymentGateway {
  return {
    async createCustomer(params: GatewayCustomerParams) {
      const data = await asaasRequest(apiKey, '/customers', 'POST', {
        name: params.name,
        cpfCnpj: params.document.replace(/\D/g, ''),
        email: params.email,
        phone: params.phone?.replace(/\D/g, ''),
      })
      return { id: data.id as string }
    },

    async createCharge(params: GatewayChargeParams): Promise<GatewayChargeResult> {
      const data = await asaasRequest(apiKey, '/payments', 'POST', {
        customer: params.providerCustomerId,
        billingType: BILLING_TYPE_TO_ASAAS[params.billingType],
        value: params.valueCents / 100,
        dueDate: params.dueDate,
        description: params.description,
      })

      const result: GatewayChargeResult = {
        id: data.id as string,
        status: mapStatus(data.status as string),
        paymentLink: data.invoiceUrl as string | undefined,
      }

      if (params.billingType === 'pix') {
        try {
          const pix = await asaasRequest(apiKey, `/payments/${data.id}/pixQrCode`)
          result.pixQrCode = pix.encodedImage as string
          result.pixPayload = pix.payload as string
        } catch {
          // PIX QR Code pode não estar disponível de imediato — segue sem bloquear a criação da cobrança
        }
      }

      if (params.billingType === 'boleto') {
        result.boletoUrl = data.bankSlipUrl as string
      }

      return result
    },

    async cancelCharge(providerChargeId: string) {
      await asaasRequest(apiKey, `/payments/${providerChargeId}`, 'DELETE')
    },

    async getPixQrCode(providerChargeId: string) {
      const data = await asaasRequest(apiKey, `/payments/${providerChargeId}/pixQrCode`)
      return { qrCode: data.encodedImage as string, payload: data.payload as string }
    },
  }
}

export function mapAsaasWebhookStatus(asaasStatus: string): ChargeStatus {
  return mapStatus(asaasStatus)
}
