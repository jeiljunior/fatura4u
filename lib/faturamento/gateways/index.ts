// Fábrica: escolhe e instancia o adapter de gateway certo pro tenant, decifrando
// a credencial guardada em gateway_credentials. O resto do sistema (rotas de
// cobrança) só conhece a interface PaymentGateway — nunca importa um adapter
// específico direto.
import { createClient } from '@supabase/supabase-js'
import { decryptJSON } from '@/lib/faturamento/crypto'
import { createAsaasGateway } from '@/lib/faturamento/gateways/asaas'
import { createMercadoPagoGateway } from '@/lib/faturamento/gateways/mercadopago'
import type { PaymentGateway, GatewayProvider } from '@/lib/faturamento/types'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type StoredCredentials = {
  apiKey: string
  webhookToken?: string
}

export async function getGatewayForBusiness(businessId: string): Promise<{
  provider: GatewayProvider
  gateway: PaymentGateway
} | null> {
  const { data: row } = await supabaseAdmin
    .from('gateway_credentials')
    .select('provider, credentials')
    .eq('business_id', businessId)
    .eq('active', true)
    .maybeSingle()

  if (!row) return null

  const credentials = decryptJSON<StoredCredentials>((row.credentials as { enc: string }).enc)

  switch (row.provider as GatewayProvider) {
    case 'asaas':
      return { provider: 'asaas', gateway: createAsaasGateway(credentials.apiKey) }
    case 'mercadopago':
      return { provider: 'mercadopago', gateway: createMercadoPagoGateway(credentials.apiKey) }
    default:
      throw new Error(`Gateway "${row.provider}" ainda não implementado`)
  }
}

// Usado pelo webhook: decifra as credenciais já cadastradas de um provider específico
// (para validar o token de webhook) sem precisar que seja o único ativo.
export async function getStoredCredentials(businessId: string, provider: GatewayProvider): Promise<StoredCredentials | null> {
  const { data: row } = await supabaseAdmin
    .from('gateway_credentials')
    .select('credentials')
    .eq('business_id', businessId)
    .eq('provider', provider)
    .maybeSingle()

  if (!row) return null
  return decryptJSON<StoredCredentials>((row.credentials as { enc: string }).enc)
}
