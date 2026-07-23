// Envio de WhatsApp via Z-API, um dos dois canais da régua de cobrança
// (lib/faturamento/regua.ts). Cada tenant tem sua própria instância Z-API
// (whatsapp_config), provisionada manualmente pelo super admin em
// /admin/tenant/[id] — mesma lógica do módulo ATEND+ do AGEND4U, porque
// instâncias Z-API são pagas por número conectado, não é self-service.
import supabaseAdmin from '@/lib/supabase/admin'

// Envia pro Z-API sempre no formato completo (DDI + DDD + 9 dígitos) — o
// telefone do cliente às vezes é salvo sem o "9" extra, e mandar faltando
// esse dígito faz a chamada retornar sucesso mas a mensagem nunca chegar.
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  const withCountry = digits.startsWith('55') ? digits : `55${digits}`
  const local = withCountry.slice(2)
  if (local.length === 10) {
    return `55${local.slice(0, 2)}9${local.slice(2)}`
  }
  return withCountry
}

type ZapiCreds = { instance: string; token: string; clientToken: string }

async function getZapiCreds(businessId: string): Promise<ZapiCreds | null> {
  const clientToken = process.env.ZAPI_CLIENT_TOKEN
  if (!clientToken) {
    console.error('[whatsapp] ZAPI_CLIENT_TOKEN não configurado no ambiente — nenhum WhatsApp está sendo enviado')
    return null
  }

  const { data } = await supabaseAdmin
    .from('whatsapp_config')
    .select('instance, token, active')
    .eq('business_id', businessId)
    .maybeSingle()

  if (!data?.active || !data.instance || !data.token) return null

  return { instance: data.instance, token: data.token, clientToken }
}

async function zapiFetch(businessId: string, path: string, body: Record<string, unknown>): Promise<boolean> {
  const creds = await getZapiCreds(businessId)
  if (!creds) return false

  try {
    const res = await fetch(
      `https://api.z-api.io/instances/${creds.instance}/token/${creds.token}${path}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Client-Token': creds.clientToken },
        body: JSON.stringify(body),
      }
    )
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error(`[whatsapp] Z-API respondeu ${res.status} em ${path}:`, text)
    }
    return res.ok
  } catch (e) {
    console.error(`[whatsapp] erro ao chamar Z-API (${path}):`, e)
    return false
  }
}

export async function sendWhatsAppText(businessId: string, phone: string, text: string): Promise<boolean> {
  return zapiFetch(businessId, '/send-text', { phone: formatPhone(phone), message: text })
}
